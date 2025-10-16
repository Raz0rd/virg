const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações da API Umbrela
const UMBRELA_API_KEY = process.env.UMBRELA_API_KEY || '84f2022f-a84b-4d63-a727-1780e6261fe8';
const UMBRELA_API_URL = process.env.UMBRELA_API_URL || 'https://api-gateway.umbrellapag.com/api';
const UMBRELA_USER_AGENT = process.env.UMBRELA_USER_AGENT || 'UMBRELLAB2B/1.0';

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
                plan_value: valorPlano,
                order_bumps_value: valorTotalBumps,
                total_value: valorTotal,
                order_bumps_count: bumps.length,
                order_bumps_names: bumps.map(b => b.name)
            }),
            traceable: true,
            ip: req.ip || req.connection.remoteAddress || '0.0.0.0'
        };
        
        // Fazer requisição à Umbrela
        const resultado = await chamadaUmbrela('/user/transactions', 'POST', dadosTransacao);
        
        if (resultado.success && resultado.data.status === 200) {
            return res.json({
                success: true,
                data: {
                    id: resultado.data.data.id,
                    qrCode: resultado.data.data.qrCode,
                    status: resultado.data.data.status,
                    amount: resultado.data.data.amount,
                    expirationDate: resultado.data.data.pix?.expirationDate || null,
                    breakdown: {
                        plan_value: valorPlano,
                        order_bumps_value: valorTotalBumps,
                        total_value: valorTotal,
                        order_bumps_count: bumps.length
                    }
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
