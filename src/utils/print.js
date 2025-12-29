// src/utils/print.js
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// --------- 1) TEMPLATE (cupom em HTML) ----------
function buildTicketHTML(t, itens = [], opt = {}) {
  const {
    title = 'Pedido',
    cnpj = null,
    address = null,
    phone = null,
    width = '72mm', // '58mm' ou '72mm'
    signature = false,
    disclaimer = null,
    clienteStr,
    nomeFormaPagamento, // fn(fp) => 'Pix', etc.
  } = opt

  const cliente = clienteStr ?? 'Cliente'
  const total = Number(t.valor ?? t.valor_total ?? 0).toFixed(2)
  const formaPagamentoStr =
    t.forma_pagamento && typeof nomeFormaPagamento === 'function'
      ? nomeFormaPagamento(t.forma_pagamento)
      : t.forma_pagamento || ''
  const statusLinha =
    t.status_pagamento === 'PAGO'
      ? 'Pago' + (formaPagamentoStr ? ` (${formaPagamentoStr})` : '')
      : 'Não Pago'

  // CSS simples, focado em térmica
  const css = `
    body { font-family: monospace; font-size: 10px; margin: 0; }
    .center { text-align: center; }
    .r { text-align: right; }
    .ticket { width: ${width}; padding: 4mm; }
    h1 { font-size: 14px; margin: 8px 0; text-align: center; }
    .info { margin-bottom: 8px; }
    .info div { margin-bottom: 1px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 2px 0; }
    th { text-align: left; border-bottom: 1px dashed #000; }
    hr { border: 0; border-top: 1px dashed #000; }
    .total { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; font-weight: 700; }
    .signature { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; text-align: center; }
    .disclaimer { margin-top: 10px; text-align: center; font-size: 9px; }
    @media print { @page { size: ${width} auto; margin: 0; } body { margin: 0; } }
  `

  const linhas = itens
    .map((it) => {
      const q = Number(it.quantidade || 0)
      const pu = Number(it.preco_unitario_congelado || 0)
      return (
        '<tr>' +
        `<td>${escapeHtml(it.nome_produto_congelado || 'Produto')}</td>` +
        `<td class="r">${q}</td>` +
        `<td class="r">${pu.toFixed(2)}</td>` +
        `<td class="r">${(q * pu).toFixed(2)}</td>` +
        '</tr>'
      )
    })
    .join('')

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cupom</title>
<style>${css}</style></head><body>
  <div class="ticket">
    ${title ? `<h1>${escapeHtml(title)}</h1>` : ''}
    ${
      cnpj || address || phone
        ? `
      <div class="center info">
        ${cnpj ? `<div>${escapeHtml(cnpj)}</div>` : ''}
        ${address ? `<div>${escapeHtml(address)}</div>` : ''}
        ${phone ? `<div>${escapeHtml(phone)}</div>` : ''}
      </div>`
        : ''
    }
    <hr/>
    <div class="info">
      <div><b>Data:</b> ${new Date(t.data_transacao).toLocaleString('pt-BR')}</div>
      <div><b>Cliente:</b> ${escapeHtml(cliente)}</div>
    </div>
    <hr/>
    <table>
      <thead><tr><th>PRODUTO</th><th class="r">QTD</th><th class="r">V.UN</th><th class="r">V.TOT</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="total r">Total: R$ ${total}</div>
    <div><b>Status:</b> ${escapeHtml(statusLinha)}</div>
    ${signature ? `<div class="signature">_________________________<br/>Assinatura</div>` : ''}
    ${disclaimer ? `<div class="disclaimer">${escapeHtml(disclaimer)}</div>` : ''}
  </div>
</body></html>`
}

// util pra esperar imagens da página do iframe carregarem (se você colocar logo)
function whenImagesReady(doc) {
  const imgs = Array.from(doc.images || [])
  if (!imgs.length) return Promise.resolve()
  return Promise.allSettled(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((res) => {
        img.onload = img.onerror = res
      })
    }),
  )
}

// --------- 2) BACKENDS DE IMPRESSÃO ----------

// IFRAME oculto (padrão)
async function printViaIFrame(html, { preview = false } = {}) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, {
      position: 'fixed', right: '0', bottom: '0',
      width: '0', height: '0', border: '0', visibility: 'hidden'
    })

    const cleanup = () => {
      try { document.body.removeChild(iframe) } catch (e) { void e }
    }

    iframe.onload = () => {
      ;(async () => {
        try {
          await whenImagesReady(iframe.contentDocument)

          if (preview) { cleanup(); resolve(); return }

          const win = iframe.contentWindow
          const onDone = () => { cleanup(); resolve() }

          win.addEventListener('afterprint', onDone, { once: true })
          // fallback em alguns navegadores
          window.addEventListener('focus', onDone, { once: true })

          win.focus()
          win.print()
        } catch (err) {
          cleanup()
          reject(err)
        }
      })()
    }

    iframe.onerror = (e) => { cleanup(); reject(e) }

    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    doc.open(); doc.write(html); doc.close()
  })
}

// POPUP (fallback / preview)
async function printViaPopup(html, { auto = true } = {}) {
  const win = window.open('', '', 'width=360,height=640')
  if (!win) {
    alert('Pop-up bloqueado. Autorize pop-ups para imprimir.')
    return
  }
  const doc = win.document
  doc.open(); doc.write(html); doc.close()
  await whenImagesReady(doc)

  return new Promise((resolve) => {
    const done = () => { try { win.close() } catch (e) { void e } ; resolve() }
    win.addEventListener('afterprint', done, { once: true })
    if (auto) { win.focus(); win.print() } else { win.focus() } // preview
  })
}

// --------- 3) API PÚBLICA ----------

export async function printTransacao(t, itens = [], options = {}) {
  const html = buildTicketHTML(t, itens, options)
  const mode = options.mode || 'iframe' // 'iframe' | 'popup'
  const preview = !!options.preview // preview abre sem chamar print()

  if (mode === 'popup' || preview) {
    return printViaPopup(html, { auto: !preview })
  } else {
    return printViaIFrame(html, { preview })
  }
}

export { buildTicketHTML } // caso queira usar pra gerar PDF depois

