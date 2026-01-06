# Autenticacao e Usuarios

## Visao geral
- Autenticacao via Supabase (email/senha).
- Multi-tenant por empresa.
- Usuario entra por email/senha e o sistema identifica a empresa.
- Convites permitem adicionar usuarios a uma empresa existente.

## Fluxo de cadastro
1) Usuario cria conta (email/senha + nome).
2) Se existir convite pendente para o email, o app vincula automaticamente a empresa.
3) Se nao existir convite, o usuario ve a opcao de criar empresa (apenas dono).

## Criacao de empresa (restrita)
- Criacao de empresa exige permissao explicita.
- Quem pode criar:
  - Primeiro usuario do banco (quando nao existe nenhum registro em `empresa_usuarios`).
  - Emails presentes em `empresa_convites_criacao`.
- Sem permissao, o app mostra "Acesso pendente".
- Para liberar um email, adicione em `empresa_convites_criacao` (Supabase Dashboard -> Table Editor).

## Convites de usuarios
- Tela: Configuracoes -> Usuarios.
- Admin/Dono informa email e permissao.
- Se o email ja tem conta, o usuario entra na empresa imediatamente.
- Se nao tem conta, fica em "Convites pendentes" ate o cadastro.

## Permissoes
- owner/admin: acessam Configuracoes e Financeiro.
- user: acesso normal sem Configuracoes/Financeiro.

## Perfil
- Tela: /#/perfil
- Usuario pode atualizar o nome (usado para exibicao/auditoria).
- Email, empresa e permissao sao exibidos como leitura.

## MFA (2 etapas)
- MFA esta DESLIGADO no app no momento.
- O codigo e o gate de MFA estao implementados e podem ser reativados no futuro.

## Sessao e seguranca
- Logout automatico por inatividade (2 horas).
- Troca de senha no menu do usuario.
- "Esqueci a senha" envia email e abre dialogo de nova senha.
- Politica de senha forte no frontend (min 8 caracteres, letra + numero).

## Arquivos principais
- `src/stores/auth-store.js`
- `src/pages/LoginPage.vue`
- `src/pages/UsuariosEmpresaPage.vue`
- `src/pages/PerfilPage.vue`
- `src/layouts/MainLayout.vue`
- `src/components/MfaGate.vue`
- Migrations em `supabase/migrations`

## Pendencias e melhorias futuras
- Transferencia de dono (promover outro usuario e rebaixar o atual).
- Foto de perfil (upload + exibir avatar).
- Username (login por nome) se decidir adotar.
- Regras de senha no Supabase (Auth -> Password length) e possivel MFA adicional.
