const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações da API Umbrela
const UMBRELA_API_KEY = process.env.UMBRELA_API_KEY || '84f2022f-a84b-4d63-a727-1780e6261fe8';
const UMBRELA_API_URL = process.env.UMBRELA_API_URL || 'https://api-gateway.umbrellapag.com/api';
const UMBRELA_USER_AGENT = process.env.UMBRELA_USER_AGENT || 'UMBRELLAB2B/1.0';

// Configurações do Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_bY1jo1Fe_jLejtLhmLFWPm3YWfgnqXSFR';
const EMAIL_FROM = process.env.EMAIL_FROM || 'sac@famososprivacy.club';
const resend = new Resend(RESEND_API_KEY);

// Configurações de conteúdo
const GOOGLE_DRIVE_FILE_ID = process.env.GOOGLE_DRIVE_FILE_ID || '1G2beZ1cCm4Yqr8f_D5VBhdhH9izLqpmh';
const DOWNLOAD_LINK_SECRET = process.env.DOWNLOAD_LINK_SECRET || crypto.randomBytes(32).toString('hex');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// FUNÇÃO AUXILIAR: Chamada à API Umbrela
// ============================================================================
async function chamadaUmbrela(endpoint, method = 'GET', data = null) {
    const url = `${UMBRELA_API_URL}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'x-api-key': UMBRELA_API_KEY,
            'User-Agent': UMBRELA_USER_AGENT,
            'Content-Type': 'application/json'
        }
    };
    
    if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        return {
            success: response.ok,
            httpCode: response.status,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================================
// FUNÇÕES DE EMAIL
// ============================================================================

// Gerar token seguro para download
function gerarTokenDownload(transactionId, email) {
    const payload = `${transactionId}|${email}|${Date.now()}`;
    const hash = crypto.createHmac('sha256', DOWNLOAD_LINK_SECRET).update(payload).digest('hex');
    return Buffer.from(`${payload}|${hash}`).toString('base64url');
}

// Validar token de download
function validarTokenDownload(token) {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const parts = decoded.split('|');
        if (parts.length !== 4) return null;
        
        const [transactionId, email, timestamp, hash] = parts;
        const payload = `${transactionId}|${email}|${timestamp}`;
        const expectedHash = crypto.createHmac('sha256', DOWNLOAD_LINK_SECRET).update(payload).digest('hex');
        
        if (hash !== expectedHash) return null;
        
        // Token válido por 7 dias
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 7 * 24 * 60 * 60 * 1000) return null;
        
        return { transactionId, email };
    } catch (e) {
        return null;
    }
}

// Template HTML - Email QR Code Gerado
function emailTemplateQRCode(nome, qrCode, valor, expirationMinutes = 10) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Header com Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px; background: linear-gradient(135deg, #ff6b3d 0%, #ff8c61 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Virginia Fonseca</h1>
                            <p style="margin: 8px 0 0; color: #fff7ed; font-size: 14px; font-weight: 600;">PRIVACY • CONTEÚDO EXCLUSIVO</p>
                        </td>
                    </tr>
                    
                    <!-- Conteúdo -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 700;">Olá, ${nome}! 👋</h2>
                            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Seu <strong>QR Code PIX</strong> foi gerado com sucesso! Use o código abaixo para realizar o pagamento:
                            </p>
                            
                            <!-- QR Code -->
                            <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; font-weight: 600;">VALOR: R$ ${valor.toFixed(2).replace('.', ',')}</p>
                                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; display: inline-block; margin-bottom: 16px;">
                                    <code style="font-family: 'Courier New', monospace; font-size: 12px; color: #1f2937; word-break: break-all; display: block; max-width: 480px;">${qrCode}</code>
                                </div>
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">Copie e cole o código no seu app de pagamentos</p>
                            </div>
                            
                            <!-- Aviso Importante -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ ATENÇÃO:</p>
                                <p style="margin: 8px 0 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                                    Este QR Code <strong>expira em ${expirationMinutes} minutos</strong>. Complete o pagamento o quanto antes!
                                </p>
                            </div>
                            
                            <!-- Instruções -->
                            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0 0 12px; color: #15803d; font-size: 14px; font-weight: 600;">📩 Após o pagamento:</p>
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                                    Você receberá um <strong>email com o link para download</strong> do conteúdo exclusivo em até 5 minutos!
                                </p>
                            </div>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Obrigado pela sua compra! ❤️
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © ${new Date().getFullYear()} Famosos Privacy Club • Todos os direitos reservados
                            </p>
                            <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                                Dúvidas? Entre em contato: <a href="mailto:${EMAIL_FROM}" style="color: #ff6b3d; text-decoration: none;">${EMAIL_FROM}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

// Template HTML - Email Pagamento Confirmado
function emailTemplatePagamentoConfirmado(nome, transactionId, email) {
    const token = gerarTokenDownload(transactionId, email);
    const downloadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/download/${token}`;
    const driveUrl = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Header com Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 12px 12px 0 0;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Pagamento Confirmado!</h1>
                            <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px; font-weight: 600;">SEU CONTEÚDO ESTÁ PRONTO</p>
                        </td>
                    </tr>
                    
                    <!-- Conteúdo -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 700;">Parabéns, ${nome}! 🎉</h2>
                            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Seu pagamento foi <strong>confirmado com sucesso</strong>! Agora você tem acesso ao conteúdo exclusivo da Virginia Fonseca.
                            </p>
                            
                            <!-- Botão de Download -->
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${driveUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b3d 0%, #ff8c61 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(255,107,61,0.3);">
                                    📥 BAIXAR CONTEÚDO AGORA
                                </a>
                            </div>
                            
                            <!-- Instruções de Download -->
                            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0 0 12px; color: #075985; font-size: 14px; font-weight: 600;">📖 Como baixar:</p>
                                <ol style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                    <li>Clique no botão "BAIXAR CONTEÚDO AGORA"</li>
                                    <li>Você será redirecionado para o Google Drive</li>
                                    <li>Clique em "Download" ou "Fazer download" para salvar o arquivo</li>
                                    <li>Aproveite seu conteúdo exclusivo!</li>
                                </ol>
                            </div>
                            
                            <!-- Link Alternativo -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; font-weight: 600;">Link alternativo (caso o botão não funcione):</p>
                                <a href="${driveUrl}" style="color: #b45309; font-size: 12px; word-break: break-all; text-decoration: underline;">${driveUrl}</a>
                            </div>
                            
                            <!-- Informações Adicionais -->
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                                <p style="margin: 0 0 8px; color: #4b5563; font-size: 13px;"><strong>ID da Transação:</strong> ${transactionId}</p>
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">Guarde este email para acessar o conteúdo quando quiser (válido por 7 dias).</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © ${new Date().getFullYear()} Famosos Privacy Club • Todos os direitos reservados
                            </p>
                            <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                                Dúvidas? Entre em contato: <a href="mailto:${EMAIL_FROM}" style="color: #ff6b3d; text-decoration: none;">${EMAIL_FROM}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

// Enviar email via Resend
async function enviarEmail(para, assunto, html) {
    try {
        const resultado = await resend.emails.send({
            from: `Famosos Privacy <${EMAIL_FROM}>`,
            to: [para],
            subject: assunto,
            html: html
        });
        
        console.log('✅ Email enviado:', para, '|', assunto);
        return { success: true, data: resultado };
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// FUNÇÃO AUXILIAR: Validar CPF
// ============================================================================
function validarCPF(cpf) {
    cpf = cpf.replace(/[^0-9]/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    return true;
}

// ============================================================================
// ROTA: Presell (Página de Verificação de Idade)
// ============================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'presell.html'));
});

// ============================================================================
// ROTA: Virginia (Página Principal da Comunidade)
// ============================================================================
app.get('/virginia', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/virginia/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir arquivos estáticos (CSS, JS, imagens) DEPOIS das rotas específicas
// para que as rotas tenham prioridade sobre arquivos estáticos
app.use(express.static(__dirname));

// ============================================================================
// API: CRIAR TRANSAÇÃO PIX
// ============================================================================
app.post('/api/pix/criar', async (req, res) => {
    try {
        const { nome, email, telefone, cpf, valor, produto, endereco, orderBumps } = req.body;
        
        // Validar campos obrigatórios
        if (!nome || !email || !telefone || !cpf || !valor) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios ausentes'
            });
        }
        
        // Validar CPF
        if (!validarCPF(cpf)) {
            return res.status(400).json({
                success: false,
                error: 'CPF inválido'
            });
        }
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }
        
        // O valor já vem CALCULADO do frontend (plano + order bumps)
        // NÃO devemos recalcular aqui, apenas usar o que foi enviado
        const valorTotal = parseFloat(valor);
        if (isNaN(valorTotal) || valorTotal <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valor inválido'
            });
        }
        
        const valorEmCentavos = Math.round(valorTotal * 100);
        
        console.log('💰 Valor recebido do frontend:', valorTotal);
        console.log('💰 Valor em centavos para Umbrela:', valorEmCentavos);
        
        // Processar order bumps apenas para LOG (não usar para cálculo)
        const bumps = Array.isArray(orderBumps) ? orderBumps : [];
        if (bumps.length > 0) {
            console.log('🎁 Order Bumps inclusos:', bumps.map(b => `${b.name} - ${b.price}`).join(', '));
        }
        
        // Limpar dados
        const cpfLimpo = cpf.replace(/[^0-9]/g, '');
        const telefoneLimpo = telefone.replace(/[^0-9]/g, '');
        
        // Processar endereço com valores padrão
        const end = endereco || {};
        const rua = end.rua || 'Rua não informada';
        const numero = end.numero || 'S/N';
        const complemento = end.complemento || '';
        const cep = (end.cep || '00000000').replace(/[^0-9]/g, '');
        const bairro = end.bairro || 'Centro';
        const cidade = end.cidade || 'São Paulo';
        let estado = (end.estado || 'SP').toUpperCase().replace(/[^A-Z]/g, '');
        if (estado.length !== 2) estado = 'SP';
        
        // Montar items da transação
        // Enviamos apenas 1 item com o valor TOTAL já calculado
        const items = [
            {
                title: produto || 'eBook - Rei da Foda',
                unitPrice: valorEmCentavos,
                quantity: 1,
                tangible: true,
                externalRef: 'ebook_virginia'
            }
        ];
        
        console.log('📦 Item enviado para Umbrela:', items[0]);
        
        // Dados da transação para Umbrela
        const dadosTransacao = {
            amount: valorEmCentavos,
            currency: 'BRL',
            paymentMethod: 'PIX',
            customer: {
                name: nome,
                email: email,
                document: {
                    number: cpfLimpo,
                    type: 'CPF'
                },
                phone: telefoneLimpo,
                externalRef: '',
                address: {
                    street: rua,
                    streetNumber: numero,
                    complement: complemento,
                    zipCode: cep,
                    neighborhood: bairro,
                    city: cidade,
                    state: estado,
                    country: 'br'
                }
            },
            shipping: {
                fee: 0,
                address: {
                    street: rua,
                    streetNumber: numero,
                    complement: complemento,
                    zipCode: cep,
                    neighborhood: bairro,
                    city: cidade,
                    state: estado,
                    country: 'br'
                }
            },
            items: items,
            pix: {
                expiresInDays: 1
            },
            postbackUrl: '',
            metadata: JSON.stringify({
                source: 'virginia_privacy',
                timestamp: new Date().toISOString(),
                total_value: valorTotal,
                order_bumps_count: bumps.length,
                order_bumps_names: bumps.map(b => b.name).join(', ')
            }),
            traceable: true,
            ip: req.ip || req.connection.remoteAddress || '0.0.0.0'
        };
        
        // Fazer requisição à Umbrela
        const resultado = await chamadaUmbrela('/user/transactions', 'POST', dadosTransacao);
        
        if (resultado.success && resultado.data.status === 200) {
            const transactionData = resultado.data.data;
            
            // Enviar email com QR Code (não aguarda para não atrasar resposta)
            enviarEmail(
                email,
                '💳 Seu QR Code PIX está pronto!',
                emailTemplateQRCode(nome, transactionData.qrCode, valorTotal, 10)
            ).catch(err => console.error('Erro ao enviar email QR Code:', err));
            
            return res.json({
                success: true,
                data: {
                    id: transactionData.id,
                    qrCode: transactionData.qrCode,
                    status: transactionData.status,
                    amount: transactionData.amount,
                    expirationDate: transactionData.pix?.expirationDate || null,
                    total_value: valorTotal,
                    order_bumps_count: bumps.length
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                error: resultado.data?.message || 'Erro ao criar transação',
                details: resultado.data || null
            });
        }
        
    } catch (error) {
        console.error('Erro ao criar transação PIX:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
        });
    }
});

// ============================================================================
// API: VERIFICAR STATUS DO PAGAMENTO
// ============================================================================
app.get('/api/pix/verificar/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                error: 'ID da transação não fornecido'
            });
        }
        
        const resultado = await chamadaUmbrela(`/user/transactions/${transactionId}`, 'GET');
        
        if (resultado.success && resultado.data.status === 200) {
            return res.json({
                success: true,
                data: {
                    id: resultado.data.data.id,
                    status: resultado.data.data.status,
                    amount: resultado.data.data.amount,
                    paymentMethod: resultado.data.data.paymentMethod,
                    paidAt: resultado.data.data.paidAt || null,
                    pago: resultado.data.data.status === 'PAID'
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                error: resultado.data?.message || 'Erro ao verificar transação',
                details: resultado.data || null
            });
        }
        
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
        });
    }
});

// ============================================================================
// API: WEBHOOK - Notificação de Pagamento
// ============================================================================
app.post('/api/webhook/umbrela', async (req, res) => {
    try {
        console.log('📬 Webhook recebido da Umbrela:', JSON.stringify(req.body));
        
        const { id, status, customer } = req.body;
        
        // Verificar se o pagamento foi confirmado
        if (status && String(status).toUpperCase() === 'PAID') {
            console.log('✅ Pagamento confirmado! ID:', id);
            
            // Buscar detalhes da transação
            const transacaoResult = await chamadaUmbrela(`/user/transactions/${id}`, 'GET');
            
            if (transacaoResult.success && transacaoResult.data.status === 200) {
                const transacao = transacaoResult.data.data;
                const nomeCliente = customer?.name || transacao.customer?.name || 'Cliente';
                const emailCliente = customer?.email || transacao.customer?.email;
                
                if (emailCliente) {
                    // Enviar email com link de download
                    await enviarEmail(
                        emailCliente,
                        '🎉 Pagamento Confirmado - Seu Conteúdo Está Pronto!',
                        emailTemplatePagamentoConfirmado(nomeCliente, id, emailCliente)
                    );
                    
                    console.log('📧 Email de confirmação enviado para:', emailCliente);
                }
            }
        }
        
        // Sempre retornar 200 para o webhook
        return res.status(200).json({ success: true, received: true });
        
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        // Ainda retorna 200 para não ficar reenviando
        return res.status(200).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ROTA: Download Protegido
// ============================================================================
app.get('/download/:token', (req, res) => {
    try {
        const { token } = req.params;
        
        // Validar token
        const validacao = validarTokenDownload(token);
        
        if (!validacao) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Link Inválido ou Expirado</title>
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                        .container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 400px; }
                        h1 { color: #e11d48; font-size: 24px; margin: 0 0 16px; }
                        p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⚠️ Link Inválido ou Expirado</h1>
                        <p>Este link de download não é válido ou já expirou. Por favor, verifique seu email para obter um novo link.</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        console.log('✅ Token válido - Redirecionando para download:', validacao);
        
        // Redirecionar para o Google Drive
        const driveUrl = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;
        return res.redirect(driveUrl);
        
    } catch (error) {
        console.error('Erro na rota de download:', error);
        return res.status(500).send('Erro interno do servidor');
    }
});

// ============================================================================
// ROTA: Health Check
// ============================================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🚀 Servidor Virginia Privacy Rodando!                 ║
║                                                               ║
║        📡 Porta: ${PORT}                                          ║
║        🌐 URL: http://localhost:${PORT}                           ║
║        📝 API PIX: http://localhost:${PORT}/api/pix               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
