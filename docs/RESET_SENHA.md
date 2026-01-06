# Reset de Senha (Supabase)

## O que foi implementado no app
- Botao "Esqueci a senha" na tela de login envia email via Supabase.
- Ao abrir o link do email, o Supabase dispara o evento PASSWORD_RECOVERY.
- O app abre o dialogo de nova senha automaticamente.
- O envio de email usa `redirectTo` para `/#/login`.

## Configuracao necessaria no Supabase (producao)
No Supabase Dashboard:
1) Authentication -> URL Configuration
2) Site URL
   - `https://seu-dominio.com`
3) Redirect URLs (adicionar todas as usadas)
   - `https://seu-dominio.com/#/login`
   - `http://localhost:9000/#/login` (para dev)

## Como testar
- No app, clique em "Esqueci a senha" e informe o email.
- Abra o link do email.
- O app deve abrir o login e mostrar o dialogo de nova senha.

## Observacoes
- Sem dominio configurado, o link pode abrir o login comum e nao acionar o fluxo.
- Quando o dominio estiver pronto, basta ajustar o Site URL e Redirect URLs.
