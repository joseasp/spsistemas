alter table public.caixa_operacoes
  add constraint caixa_operacoes_pkey primary key (id);

alter table public.clientes
  add constraint clientes_pkey primary key (id);

alter table public.funcionarios_empresa
  add constraint funcionarios_empresa_pkey primary key (id);

alter table public.itens_transacao
  add constraint itens_transacao_pkey primary key (id);

alter table public.pagamentos
  add constraint pagamentos_pkey primary key (id);

alter table public.produtos
  add constraint produtos_pkey primary key (id);

alter table public.transacoes
  add constraint transacoes_pkey primary key (id);

alter table public.funcionarios_empresa
  add constraint funcionarios_empresa_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id);

alter table public.itens_transacao
  add constraint itens_transacao_transacao_id_fkey
  foreign key (transacao_id) references public.transacoes (id);

alter table public.itens_transacao
  add constraint itens_transacao_produto_id_fkey
  foreign key (produto_id) references public.produtos (id);

alter table public.pagamentos
  add constraint pagamentos_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id);

alter table public.pagamentos
  add constraint pagamentos_origem_transacao_id_fkey
  foreign key (origem_transacao_id) references public.transacoes (id);

alter table public.transacoes
  add constraint transacoes_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id);

alter table public.transacoes
  add constraint transacoes_caixa_operacao_id_fkey
  foreign key (caixa_operacao_id) references public.caixa_operacoes (id);

alter table public.transacoes
  add constraint transacoes_id_transacao_estornada_fkey
  foreign key (id_transacao_estornada) references public.transacoes (id);
