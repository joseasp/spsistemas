# Sessao e tempo de login

## O que ja existe no app
- Logout automatico por inatividade (2 horas).
- Esse logout e local (frontend). Se o usuario nao mexer, a sessao e encerrada.

## O que ainda depende do Supabase
A duracao real da sessao depende das configuracoes do Supabase (JWT/refresh tokens).
Sem ajustes, a sessao pode durar muito tempo.

## Recomendacao (quando quiser reforcar)
No Supabase Dashboard:
1) Authentication -> Settings -> JWT
2) Ajustar tempos:
   - Access token: 1h
   - Refresh token: 7 a 30 dias (conforme politica de seguranca)
3) Opcional: invalidar sessao ao trocar senha

## Observacoes
- O timeout de inatividade do app nao substitui o controle do token do Supabase.
- Se quiser, o timeout local pode ser reduzido (ex: 30 min).
