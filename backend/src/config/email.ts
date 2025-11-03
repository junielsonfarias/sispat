import nodemailer, { createTransport } from 'nodemailer';
import Handlebars from 'handlebars';
import { prisma } from '../lib/prisma';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  enabled: boolean;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    // Não carregar configuração no construtor para evitar problemas de inicialização
    // A configuração será carregada quando necessário
  }

  /**
   * Carregar configuração de email do banco de dados
   */
  private async loadConfig(): Promise<void> {
    try {
      // ✅ Carregar configuração de email do banco de dados
      // Nota: EmailConfig pode não estar disponível no Prisma ainda
      // Verificar se o modelo existe antes de usar
      let emailConfig: any = null;
      try {
        // @ts-ignore - Modelo pode não estar disponível ainda
        emailConfig = await prisma.emailConfig?.findFirst();
      } catch (error) {
        // Modelo não existe, usar configuração de variáveis de ambiente
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Modelo EmailConfig não encontrado, usando variáveis de ambiente');
        }
      }
      
      if (emailConfig && emailConfig.enabled) {
        this.config = {
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
          from: emailConfig.fromAddress,
          enabled: emailConfig.enabled,
        };

        this.transporter = createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: this.config.auth,
        });

        // Verificar conexão
        await this.transporter.verify();
        // ✅ Usar logger em vez de console (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Configuração de email carregada e verificada');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Configuração de email não encontrada ou desabilitada');
        }
      }
    } catch (error) {
      // ✅ Log de erro usando logger apropriado
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao carregar configuração de email:', error);
      }
      this.config = null;
      this.transporter = null;
    }
  }

  /**
   * Recarregar configuração (útil quando config é atualizada)
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Verificar se o serviço de email está configurado
   */
  async isConfigured(): Promise<boolean> {
    if (this.config === null || this.transporter === null) {
      await this.loadConfig();
    }
    return this.config !== null && this.transporter !== null;
  }

  /**
   * Enviar email genérico
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!(await this.isConfigured())) {
      console.error('❌ Serviço de email não configurado');
      return false;
    }

    try {
      const info = await this.transporter!.sendMail({
        from: this.config!.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });

      console.log('✅ Email enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Enviar email de reset de senha
   */
  async sendPasswordResetEmail(
    email: string, 
    name: string, 
    resetToken: string, 
    municipalityName: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const template = this.getPasswordResetTemplate();
    const compiledTemplate = Handlebars.compile(template.html);
    
    const html = compiledTemplate({
      name,
      resetUrl,
      municipalityName,
      expiryHours: 1, // Token expira em 1 hora
    });

    const subject = template.subject.replace('{{municipalityName}}', municipalityName);
    const text = template.text
      .replace('{{name}}', name)
      .replace('{{resetUrl}}', resetUrl)
      .replace('{{municipalityName}}', municipalityName)
      .replace('{{expiryHours}}', '1');

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Enviar email de boas-vindas
   */
  async sendWelcomeEmail(
    email: string, 
    name: string, 
    temporaryPassword: string, 
    municipalityName: string
  ): Promise<boolean> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    
    const template = this.getWelcomeTemplate();
    const compiledTemplate = Handlebars.compile(template.html);
    
    const html = compiledTemplate({
      name,
      email,
      temporaryPassword,
      loginUrl,
      municipalityName,
    });

    const subject = template.subject.replace('{{municipalityName}}', municipalityName);
    const text = template.text
      .replace('{{name}}', name)
      .replace('{{email}}', email)
      .replace('{{temporaryPassword}}', temporaryPassword)
      .replace('{{loginUrl}}', loginUrl)
      .replace('{{municipalityName}}', municipalityName);

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Enviar email de teste
   */
  async sendTestEmail(to: string, municipalityName: string): Promise<boolean> {
    const template = this.getTestTemplate();
    const compiledTemplate = Handlebars.compile(template.html);
    
    const html = compiledTemplate({
      municipalityName,
      timestamp: new Date().toLocaleString('pt-BR'),
    });

    const subject = template.subject.replace('{{municipalityName}}', municipalityName);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Template para reset de senha
   */
  private getPasswordResetTemplate(): EmailTemplate {
    return {
      subject: 'Redefinição de Senha - {{municipalityName}}',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Redefinição de Senha</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .url-box { background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{municipalityName}}</h1>
              <h2>Redefinição de Senha</h2>
            </div>
            <div class="content">
              <p>Olá <strong>{{name}}</strong>,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema SISPAT.</p>
              
              <p>Para redefinir sua senha, clique no botão abaixo:</p>
              
              <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Redefinir Senha</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este link expira em <strong>{{expiryHours}} hora(s)</strong></li>
                  <li>Se você não solicitou esta redefinição, ignore este email</li>
                  <li>Não compartilhe este link com outras pessoas</li>
                </ul>
              </div>
              
              <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
              <div class="url-box">{{resetUrl}}</div>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema SISPAT. Não responda a este email.</p>
              <p>{{municipalityName}} - Sistema Integrado de Patrimônio</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Redefinição de Senha - {{municipalityName}}
        
        Olá {{name}},
        
        Recebemos uma solicitação para redefinir a senha da sua conta no sistema SISPAT.
        
        Para redefinir sua senha, acesse: {{resetUrl}}
        
        IMPORTANTE:
        - Este link expira em {{expiryHours}} hora(s)
        - Se você não solicitou esta redefinição, ignore este email
        - Não compartilhe este link com outras pessoas
        
        {{municipalityName}} - Sistema Integrado de Patrimônio
      `
    };
  }

  /**
   * Template para email de boas-vindas
   */
  private getWelcomeTemplate(): EmailTemplate {
    return {
      subject: 'Bem-vindo ao SISPAT - {{municipalityName}}',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bem-vindo ao SISPAT</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .credentials { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{municipalityName}}</h1>
              <h2>Bem-vindo ao SISPAT!</h2>
            </div>
            <div class="content">
              <p>Olá <strong>{{name}}</strong>,</p>
              <p>Sua conta foi criada com sucesso no Sistema Integrado de Patrimônio.</p>
              
              <div class="credentials">
                <h3>🔐 Suas Credenciais:</h3>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Senha Temporária:</strong> {{temporaryPassword}}</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Altere sua senha no primeiro acesso</li>
                  <li>Mantenha suas credenciais seguras</li>
                  <li>Em caso de dúvidas, entre em contato com o administrador</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Fazer Login</a>
              </div>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema SISPAT. Não responda a este email.</p>
              <p>{{municipalityName}} - Sistema Integrado de Patrimônio</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bem-vindo ao SISPAT - {{municipalityName}}
        
        Olá {{name}},
        
        Sua conta foi criada com sucesso no Sistema Integrado de Patrimônio.
        
        SUAS CREDENCIAIS:
        Email: {{email}}
        Senha Temporária: {{temporaryPassword}}
        
        IMPORTANTE:
        - Altere sua senha no primeiro acesso
        - Mantenha suas credenciais seguras
        - Em caso de dúvidas, entre em contato com o administrador
        
        Acesse o sistema em: {{loginUrl}}
        
        {{municipalityName}} - Sistema Integrado de Patrimônio
      `
    };
  }

  /**
   * Template para email de teste
   */
  private getTestTemplate(): EmailTemplate {
    return {
      subject: 'Teste de Email - {{municipalityName}}',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Teste de Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{municipalityName}}</h1>
              <h2>Teste de Configuração de Email</h2>
            </div>
            <div class="content">
              <div class="success">
                <h3>✅ Email Funcionando!</h3>
                <p>A configuração de email está funcionando corretamente.</p>
              </div>
              
              <p><strong>Data/Hora do Teste:</strong> {{timestamp}}</p>
              <p><strong>Sistema:</strong> SISPAT 2.0</p>
              
              <p>Se você recebeu este email, significa que:</p>
              <ul>
                <li>O servidor SMTP está configurado corretamente</li>
                <li>As credenciais de autenticação estão válidas</li>
                <li>Os templates de email estão funcionando</li>
              </ul>
            </div>
            <div class="footer">
              <p>Este é um email de teste do sistema SISPAT.</p>
              <p>{{municipalityName}} - Sistema Integrado de Patrimônio</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Teste de Email - {{municipalityName}}
        
        ✅ Email Funcionando!
        
        A configuração de email está funcionando corretamente.
        
        Data/Hora do Teste: {{timestamp}}
        Sistema: SISPAT 2.0
        
        Se você recebeu este email, significa que:
        - O servidor SMTP está configurado corretamente
        - As credenciais de autenticação estão válidas
        - Os templates de email estão funcionando
        
        {{municipalityName}} - Sistema Integrado de Patrimônio
      `
    };
  }
}

// Inicializar o serviço de email apenas quando necessário
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
};

export const emailService = {
  async reloadConfig() {
    const service = getEmailService();
    await service.reloadConfig();
  },
  async sendPasswordResetEmail(email: string, name: string, resetToken: string, municipalityName: string) {
    const service = getEmailService();
    return service.sendPasswordResetEmail(email, name, resetToken, municipalityName);
  },
  async sendWelcomeEmail(email: string, name: string, temporaryPassword: string, municipalityName: string) {
    const service = getEmailService();
    return service.sendWelcomeEmail(email, name, temporaryPassword, municipalityName);
  },
  async sendTestEmail(to: string, municipalityName: string) {
    const service = getEmailService();
    return service.sendTestEmail(to, municipalityName);
  },
  async isConfigured() {
    const service = getEmailService();
    return service.isConfigured();
  }
};
