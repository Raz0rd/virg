# 🚀 Virginia Privacy - Sistema de Pagamento PIX

Servidor Node.js/Express para gerenciamento de pagamentos PIX via Umbrela (Liberpay).

## 📋 Pré-requisitos

- Node.js v16 ou superior
- NPM ou Yarn

## ⚙️ Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Copie o arquivo .env.example para .env (criar manualmente)
# E adicione suas credenciais da Umbrela
```

## 🔑 Configuração

Crie um arquivo `.env` na raiz do projeto com:

```env
UMBRELA_API_KEY=84f2022f-a84b-4d63-a727-1780e6261fe8
UMBRELA_API_URL=https://api-gateway.umbrellapag.com/api
UMBRELA_USER_AGENT=UMBRELLAB2B/1.0
PORT=3000
```

## 🚀 Executar

```bash
# Modo produção
npm start

# Modo desenvolvimento (com auto-reload)
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

## 📡 API Endpoints

### 1. **POST /api/pix/criar**
Cria uma nova transação PIX

**Body:**
```json
{
  "nome": "João da Silva",
  "email": "joao@email.com",
  "telefone": "11999999999",
  "cpf": "12345678900",
  "valor": 29.90,
  "produto": "Virginia Fonseca - Privacy",
  "orderBumps": [
    {
      "name": "Mc Mirella",
      "price": "R$ 16,90"
    }
  ],
  "endereco": {
    "rua": "Rua Exemplo",
    "numero": "123",
    "complemento": "Apto 101",
    "cep": "01000-000",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-da-transacao",
    "qrCode": "00020126...",
    "status": "WAITING_PAYMENT",
    "amount": 4680,
    "expirationDate": "2025-04-17T00:00:00.000Z",
    "breakdown": {
      "plan_value": 29.90,
      "order_bumps_value": 16.90,
      "total_value": 46.80,
      "order_bumps_count": 1
    }
  }
}
```

### 2. **GET /api/pix/verificar/:transactionId**
Verifica o status de uma transação

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-da-transacao",
    "status": "PAID",
    "amount": 4680,
    "paymentMethod": "PIX",
    "paidAt": "2025-04-16T15:30:00.000Z",
    "pago": true
  }
}
```

### 3. **GET /api/health**
Health check do servidor

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-04-16T15:30:00.000Z",
  "uptime": 3600
}
```

## 🎯 Funcionalidades

✅ Integração completa com API Umbrela (Liberpay)  
✅ Suporte a Order Bumps (múltiplos produtos)  
✅ Geração automática de QR Code PIX  
✅ Verificação de status de pagamento  
✅ Validação de CPF  
✅ Validação de email  
✅ Proteção da API Key no servidor  
✅ CORS habilitado  
✅ Logs detalhados  

## 📁 Estrutura de Arquivos

```
c:\xampp\htdocs\virg\
├── server.js                           # Servidor Express
├── package.json                        # Dependências
├── .env.example                        # Template de variáveis
├── index.html                          # Página principal
├── indexTOP_files/
│   └── payment.js.transferir          # Script de pagamento
└── api/
    └── payment/
        └── pix.php                     # API PHP (LEGADO - NÃO USAR)
```

## 🔒 Segurança

- ✅ API Key protegida no backend
- ✅ Validação de dados antes do envio
- ✅ Sanitização de CPF e telefone
- ✅ Valores padrão para campos opcionais
- ✅ Tratamento de erros completo

## 📊 Status Possíveis (Umbrela)

| Status | Descrição |
|--------|-----------|
| `WAITING_PAYMENT` | Aguardando pagamento |
| `PAID` | ✅ Pago (confirmado) |
| `PROCESSING` | Processando |
| `REFUSED` | Recusado |
| `CANCELED` | Cancelado |
| `REFUNDED` | Reembolsado |

## 🐛 Troubleshooting

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro: "Port 3000 already in use"
Altere a porta no arquivo `.env`:
```env
PORT=3001
```

### Erro ao gerar PIX
Verifique:
1. API Key está correta
2. CPF está válido (11 dígitos)
3. Email está no formato correto
4. Valor é maior que 0

## 📞 Suporte

- **Documentação Umbrela**: https://docs.umbrellapag.com
- **Email**: suporte@umbrellapag.com

## 📝 Notas Importantes

1. **NUNCA exponha a API Key no frontend**
2. **Valores são enviados em centavos** para a Umbrela
3. **Status `PAID` é o único que confirma pagamento**
4. **Order Bumps são processados automaticamente**
5. **Endereço pode ser vazio** (usa valores padrão)

---

**Desenvolvido para Virginia Privacy** 🔐
