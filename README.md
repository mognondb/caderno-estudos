# Caderno de Estudos

Caderno pessoal de estudos: plano por ciclos, calendário semanal, biblioteca, leitor de PDF com anotações, fichamentos e sínteses.

```
CADERNO DE ESTUDOS: VERSÃO INDEPENDENTE
Leva uns 10 minutos. O passo 2 é mais confortável num computador.

1. GUARDE SEUS DADOS
   No caderno atual (claude.ai): Plano › Backup e agenda › Baixar backup (.json).

2. CRIE O BANCO DE DADOS (Supabase, gratuito)
   a) Entre em supabase.com e crie uma conta.
   b) New project. Dê um nome, crie uma senha do banco (guarde) e escolha a região South America (São Paulo).
   c) Espere o projeto ficar pronto (1 a 2 minutos).
   d) Menu lateral › SQL Editor › New query. Cole todo o conteúdo do arquivo supabase.sql e clique em Run.
      Deve aparecer "Success. No rows returned".
   e) Menu lateral › Authentication › Users › Add user › Create new user.
      Coloque seu e-mail e uma senha e marque "Auto Confirm User". Esse é o seu login no caderno.
   f) Authentication › Sign In / Providers: desligue "Allow new users to sign up",
      para ninguém mais conseguir criar conta.
   g) A URL do projeto e a chave publishable já estão gravadas no index.html.

3. A PÁGINA
   Já está publicada pelo GitHub Pages em https://mognondb.github.io/caderno-estudos/
   (Settings › Pages › Deploy from a branch › main › / (root)).

4. PRIMEIRO ACESSO
   a) Abra o endereço e entre com o e-mail e a senha do passo 2e.
   b) Plano › Backup e agenda › Restaurar backup… e escolha o arquivo do passo 1.

5. NO CELULAR
   Abra o endereço no navegador, entre e use "Adicionar à tela inicial".
   Ele vira um ícone como de aplicativo. Você só faz login uma vez por aparelho.

BOM SABER
- PDFs: até 20 MB cada. O plano gratuito do Supabase tem 1 GB para arquivos e 500 MB para dados.
- Se o projeto ficar uma semana sem uso, o Supabase o pausa. Basta entrar em supabase.com
  e clicar em "Restore project". Os dados não se perdem.
- Atualizações do caderno entram por este repositório. Seus dados ficam no Supabase e não são afetados.
- Faça um backup (.json) de vez em quando, pelo próprio caderno.
```
