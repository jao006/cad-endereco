# Atlas — Gestão de Clientes e Endereços

Aplicação web com HTML, CSS, JavaScript, Firebase Firestore e API ViaCEP. Preparada para publicação na Vercel.

## Arquivos
- `index.html`: estrutura das telas.
- `style.css`: identidade visual responsiva.
- `app.js`: integração com Firestore, CRUD e consulta ViaCEP.
- `vercel.json`: configuração de publicação.

## 1. Configurar Firebase
1. O arquivo `app.js` já está configurado para o projeto Firebase `nuvem2-melqui` informado pelo usuário.
2. No Firebase Console, abra esse projeto e entre em **Build → Firestore Database**. Se ainda não existir banco, clique em **Criar banco de dados**.
3. Na aba **Regras** do Firestore, substitua o conteúdo pelas regras do arquivo `firestore.rules` e clique em **Publicar**.
4. Abra o site usando Live Server. Na tela inicial, clique em **＋ Inserir 25 exemplos**. Os clientes fictícios serão gravados na coleção `clientes` e aparecerão na listagem.
5. Se o projeto Firebase ainda não tiver o Firestore criado, o cadastro não funcionará até criar o banco.

### Atenção às regras
As regras fornecidas liberam leitura e escrita sem login apenas até **30/11/2026**, para facilitar a demonstração escolar com dados fictícios. Enquanto estiverem ativas, qualquer pessoa que conheça a configuração do projeto pode acessar o banco. Não armazene dados reais e não use essas regras em produção. Depois da atividade, configure Firebase Authentication e regras que permitam acesso somente a usuários autenticados.

## 2. Testar localmente
Como os módulos JavaScript são importados por URL, rode por um servidor local em vez de abrir `index.html` diretamente. No VS Code/VSCodium, use a extensão Live Server e clique em **Go Live**.

## 3. Publicar na Vercel
1. Envie os quatro arquivos para um repositório GitHub.
2. Entre em https://vercel.com/ e importe o repositório.
3. Framework Preset: **Other**. Build Command e Output Directory podem ficar vazios.
4. Clique em Deploy. A Vercel fornecerá um endereço `.vercel.app`.

## Como a API funciona
A aplicação consulta `https://viacep.com.br/ws/CEP/json/` quando o usuário solicita a busca. O retorno preenche logradouro, bairro, cidade, UF e complemento quando disponível. O usuário ainda pode corrigir os campos manualmente.

## Recursos
- Cadastrar cliente PF ou PJ.
- Consultar e listar registros do Firestore.
- Editar e excluir registros.
- Busca textual e filtro por tipo.
- Indicadores no painel.
- Busca de endereço por CEP via ViaCEP.
- Layout responsivo para celular e computador.
