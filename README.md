# OpenID Connect CDK

Um projeto AWS CDK (Cloud Development Kit) em TypeScript que configura um **OpenID Connect (OIDC) Provider** para permitir que o GitHub Actions faça deploy de recursos na AWS sem a necessidade de armazenar credenciais de acesso (Access Keys) como secrets.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [O que é OpenID Connect?](#o-que-é-openid-connect)
- [Benefícios](#benefícios)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Funciona](#como-funciona)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Comandos Úteis](#comandos-úteis)
- [Exemplo de Uso no GitHub Actions](#exemplo-de-uso-no-github-actions)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)

## 🎯 Sobre o Projeto

Este projeto automatiza a criação de um **OpenID Connect Provider** na AWS IAM, permitindo que repositórios GitHub específicos assumam uma IAM Role durante a execução de workflows do GitHub Actions. Isso elimina a necessidade de criar e gerenciar Access Keys, melhorando significativamente a segurança e facilitando o gerenciamento de credenciais.

## 🔐 O que é OpenID Connect?

OpenID Connect (OIDC) é um protocolo de autenticação baseado em OAuth 2.0 que permite que aplicações verifiquem a identidade de um usuário ou serviço. No contexto deste projeto:

- **GitHub Actions** atua como o provedor de identidade (Identity Provider)
- **AWS IAM** atua como o provedor de serviços (Service Provider)
- O GitHub fornece tokens JWT que a AWS valida para permitir o acesso aos recursos

## ✨ Benefícios

- ✅ **Segurança Aprimorada**: Não há necessidade de armazenar Access Keys como secrets
- ✅ **Rotação Automática**: Os tokens são gerados automaticamente pelo GitHub
- ✅ **Auditoria**: Melhor rastreabilidade através dos logs do CloudTrail
- ✅ **Controle Granular**: Permite restringir acesso por repositório, branch, ou tag
- ✅ **Compliance**: Alinhado com as melhores práticas de segurança da AWS e GitHub

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18.x ou superior)
- **npm** ou **yarn**
- **AWS CLI** configurado com credenciais válidas
- **AWS CDK CLI** (`npm install -g aws-cdk` ou `npx aws-cdk`)
- Uma **conta AWS** com permissões para criar recursos IAM
- Um **repositório GitHub** para configurar o OIDC

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/marciocadev/openid-connect-cdk.git
cd openid-connect-cdk
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Compile o projeto TypeScript:
```bash
npm run build
# ou
yarn build
```

## ⚙️ Configuração

### 1. Configurar Repositórios GitHub

Edite o arquivo `lib/openid-connect-cdk-stack.ts` e ajuste a lista de repositórios na constante `REPO_LIST`:

```typescript
const REPO_LIST: { owner: string, repo?: string, filter?: string }[] = [
  {
    owner: "marciocadev",
    repo: "openid-connect-cdk",
  },
  // Adicione mais repositórios conforme necessário
];
```

**Opções de configuração:**
- `owner`: O proprietário da organização ou usuário do GitHub (obrigatório)
- `repo`: O nome do repositório específico (obrigatório)
- `filter`: Filtro para branches/tags (opcional, padrão é `*` para todos)

**Exemplos:**
```typescript
// Permite um repositório específico (todas as branches e tags)
{ owner: "marciocadev", repo: "meu-repo" }

// Permite apenas a branch main de um repositório
{ owner: "marciocadev", repo: "meu-repo", filter: "ref:refs/heads/main" }

// Permite apenas tags
{ owner: "marciocadev", repo: "meu-repo", filter: "ref:refs/tags/*" }

// Permite todas as branches de um repositório específico
{ owner: "marciocadev", repo: "meu-repo", filter: "ref:refs/heads/*" }
```

### 2. Obter o Thumbprint do GitHub Actions

O thumbprint é um hash SHA-1 do certificado SSL do servidor OIDC do GitHub. Ele é usado pela AWS para validar que os tokens realmente vêm do GitHub. Você precisa obter o thumbprint e atualizá-lo no código.

**Método 1: Usando OpenSSL (Recomendado)**

Execute o seguinte comando para obter o thumbprint:

```bash
echo | openssl s_client -servername token.actions.githubusercontent.com -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null | openssl x509 -fingerprint -noout -sha1 | sed 's/://g' | sed 's/SHA1 Fingerprint=//'
```

Isso retornará algo como:
```
6938FD4D98BAB03FAADB97B34396831E3780AEA1
```

**Método 2: Usando o formato completo do certificado**

Alternativamente, você pode obter o thumbprint com um comando mais detalhado:

```bash
HOST=$(curl https://vstoken.actions.githubusercontent.com/.well-known/openid-configuration \
| jq -r '.jwks_uri | split("/")[2]')

echo | openssl s_client -servername $HOST -showcerts -connect $HOST:443 2> /dev/null \
| sed -n -e '/BEGIN/h' -e '/BEGIN/,/END/H' -e '$x' -e '$p' | tail +2 \
| openssl x509 -fingerprint -noout \
| sed -e "s/.*=//" -e "s/://g" \
| tr "ABCDEF" "abcdef"

2b18947a6a9fc7764fd8b5fb18a863b0c6dac24f
```

**Método 3: Verificar o thumbprint atual do GitHub**

O GitHub publica o thumbprint oficial em sua documentação. Você pode verificar a documentação oficial do GitHub para OIDC:

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

**Atualizar o Thumbprint no Código**

Após obter o thumbprint, atualize o arquivo `lib/openid-connect-cdk-stack.ts`:

```typescript
const gitHubOidcProvider = new OidcProviderNative(this, "GitHubOidcProvider", {
  url: `https://${gitHubDomain}`,
  clientIds: ["sts.amazonaws.com"],
  thumbprints: ["2b18947a6a9fc7764fd8b5fb18a863b0c6dac24f"], // Substitua pelo thumbprint atual
  oidcProviderName: "GithubOidcProvider",
});
```

**⚠️ Importante**: 
- O thumbprint pode mudar se o GitHub atualizar seus certificados SSL
- Certifique-se de usar o thumbprint correto e mais atualizado
- O thumbprint no código é apenas um exemplo e deve ser atualizado com o valor real
- Se o OIDC Provider já existe na sua conta AWS, você pode verificar o thumbprint atual no console da AWS: IAM → Identity providers → `token.actions.githubusercontent.com`

**Nota**: Algumas versões do AWS CDK podem buscar o thumbprint automaticamente se ele não for especificado. No entanto, é uma boa prática especificá-lo explicitamente para maior controle e segurança.

### 3. Configurar Ambiente AWS (Opcional)

Se necessário, edite o arquivo `bin/openid-connect-cdk.ts` para especificar a conta e região AWS:

```typescript
new OpenidConnectCdkStack(app, 'OpenidConnectCdkStack', {
  env: { 
    account: '123456789012',  // Sua conta AWS
    region: 'us-east-1'        // Sua região preferida
  },
});
```

### 4. Bootstrap do CDK (Primeira Vez)

Se esta é a primeira vez usando CDK nesta conta/região, execute o bootstrap:

```bash
npx cdk bootstrap
```

## 🔧 Como Funciona

O projeto cria os seguintes recursos na AWS:

1. **OIDC Provider**: Configura um Identity Provider no IAM apontando para `token.actions.githubusercontent.com`
2. **IAM Role**: Cria uma role IAM (`GitHubOidcRole`) que pode ser assumida via OIDC
3. **Trust Policy**: Define quais repositórios GitHub podem assumir a role
4. **Managed Policies**: Anexa políticas gerenciadas à role (por padrão, `AdministratorAccess`)

**⚠️ Importante**: Por padrão, a role é criada com `AdministratorAccess`. Você deve ajustar as políticas conforme suas necessidades de segurança!

### Fluxo de Autenticação

```
GitHub Actions Workflow
    ↓
Solicita token OIDC do GitHub
    ↓
GitHub retorna JWT token
    ↓
AWS Actions assume a IAM Role usando o token
    ↓
AWS valida o token e permite acesso
```

## 📁 Estrutura do Projeto

```
openid-connect-cdk/
├── .github/
│   └── workflows/
│       ├── close-pr.yaml      # Workflow para deploy após merge de PR
│       └── push-main.yaml     # Workflow para deploy em push para main
├── bin/
│   └── openid-connect-cdk.ts  # Ponto de entrada da aplicação CDK
├── lib/
│   └── openid-connect-cdk-stack.ts  # Definição do stack AWS
├── test/
│   └── openid-connect-cdk.test.ts   # Testes unitários
├── cdk.json                   # Configuração do CDK
├── package.json              # Dependências e scripts
├── tsconfig.json             # Configuração TypeScript
└── README.md                 # Este arquivo
```

## 💻 Comandos Úteis

### Desenvolvimento

```bash
# Compilar TypeScript
npm run build

# Compilar em modo watch (observa mudanças)
npm run watch

# Executar testes
npm run test
```

### CDK

```bash
# Visualizar as mudanças antes de fazer deploy
npx cdk diff

# Sintetizar o template CloudFormation
npx cdk synth

# Fazer deploy do stack
npx cdk deploy

# Destruir o stack (remover todos os recursos)
npx cdk destroy
```

### Verificação

```bash
# Listar todos os stacks
npx cdk list

# Validar o código CDK
npx cdk doctor
```

## 🔄 Exemplo de Uso no GitHub Actions

Depois de fazer o deploy do stack, você precisará:

1. **Obter o ARN da Role**: O CDK exibirá o ARN da role criada, ou você pode encontrá-lo no console da AWS

2. **Configurar Secrets no GitHub**:
   - Vá para `Settings` → `Secrets and variables` → `Actions`
   - Adicione os seguintes secrets:
     - `AWS_OIDC_ROLE`: O ARN completo da role (ex: `arn:aws:iam::123456789012:role/GitHubOidcRole`)
     - `AWS_REGION`: A região AWS onde os recursos estão (ex: `us-east-1`)

3. **Configurar Permissões no Workflow**:

```yaml
permissions:
  id-token: write   # Necessário para OIDC
  contents: read    # Necessário para checkout
```

4. **Usar a Action de Configuração AWS**:

```yaml
- name: Configure AWS credentials via OIDC
  uses: aws-actions/configure-aws-credentials@v5
  with:
    role-to-assume: ${{ secrets.AWS_OIDC_ROLE }}
    aws-region: ${{ secrets.AWS_REGION }}
```

**Exemplo completo de workflow:**

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Deploy application
        run: |
          # Seus comandos de deploy aqui
          echo "Deploying to AWS..."
```

## 🔒 Segurança

### Recomendações

1. **Princípio do Menor Privilégio**: Modifique as políticas anexadas à role para conceder apenas as permissões necessárias. O `AdministratorAccess` é apenas um exemplo.

2. **Filtros Específicos**: Use filtros específicos de branch/tag sempre que possível para limitar quando a role pode ser assumida.

3. **Auditoria**: Monitore os logs do CloudTrail para verificar quando e como a role está sendo assumida.

4. **Revisão Periódica**: Revise regularmente a lista de repositórios autorizados e as permissões concedidas.

### Exemplo de Política Mais Restritiva

Para limitar a role apenas ao deploy de recursos específicos:

```typescript
// No arquivo lib/openid-connect-cdk-stack.ts
const oidcRole = new Role(this, "GitHubOidcRole", {
  roleName: "GitHubOidcRole",
  assumedBy: new OpenIdConnectPrincipal(gitHubOidcProvider, {
    // ... configuração existente
  }),
  // Substitua por políticas mais específicas
  managedPolicies: [
    // Exemplo: apenas para CloudFormation e S3
    ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
    ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
  ],
});
```

## 🐛 Troubleshooting

### Erro: "The identity provider doesn't exist"

**Causa**: O OIDC Provider não foi criado corretamente.

**Solução**: 
- Verifique se o stack foi deployado com sucesso
- Confirme que o provider foi criado no IAM → Identity providers

### Erro: "Not authorized to perform sts:AssumeRoleWithWebIdentity"

**Causa**: A trust policy da role não permite o repositório/branch do GitHub.

**Solução**:
- Verifique se o repositório está na lista `REPO_LIST`
- Confirme que o formato do subject está correto
- Verifique os filtros de branch/tag

### Erro: "Subject claim validation failed"

**Causa**: O subject claim do token JWT não corresponde ao esperado pela trust policy.

**Solução**:
- Verifique o formato do subject na trust policy
- Confirme que `permissions.id-token: write` está no workflow

### Como Verificar o Subject Claim

Para debugar, você pode adicionar um step temporário no workflow:

```yaml
- name: Debug OIDC token
  run: |
    TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r '.value')
    echo "Token: $TOKEN"
    # Decodifique o JWT em jwt.io para ver o payload
```

## 📝 Licença

Este projeto está sob a licença MIT.

## 👤 Autor

**marciocadev**

- GitHub: [@marciocadev](https://github.com/marciocadev)

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📚 Recursos Adicionais

- [Documentação AWS CDK](https://docs.aws.amazon.com/cdk/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Identity Providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [Configure AWS Credentials Action](https://github.com/aws-actions/configure-aws-credentials)

---

**⭐ Se este projeto foi útil, considere dar uma estrela!**
