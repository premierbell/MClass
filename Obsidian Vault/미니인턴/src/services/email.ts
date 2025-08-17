import nodemailer from 'nodemailer';
import { defaultLogger } from '../utils/enhancedLogger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MClassApplicationEmailData {
  userEmail: string;
  userName?: string;
  className: string;
  classStartDate: string;
  classEndDate: string;
  applicationDate: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    // 개발 환경에서는 Ethereal Email (테스트용) 사용
    if (process.env.NODE_ENV === 'development') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'verysecret'
        }
      });
    } else {
      // 프로덕션 환경에서는 실제 SMTP 서버 사용
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * 기본 이메일 전송
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      const info = await this.transporter.sendMail({
        from: `"미니인턴 M-Class" <${process.env.SMTP_USER || 'noreply@miniintern.com'}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      defaultLogger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        previewURL: nodemailer.getTestMessageUrl(info) // 개발 환경에서만 유효
      });

      return true;
    } catch (error) {
      defaultLogger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject
      });
      return false;
    }
  }

  /**
   * M클래스 신청 성공 알림 이메일
   */
  async sendMClassApplicationSuccessEmail(data: MClassApplicationEmailData): Promise<boolean> {
    const subject = `[미니인턴] M클래스 "${data.className}" 신청이 완료되었습니다!`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M클래스 신청 완료</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .class-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 14px; }
          .highlight { color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 M클래스 신청 완료!</h1>
            <p>미니인턴 M클래스에 성공적으로 신청되었습니다.</p>
          </div>
          
          <div class="content">
            <p>안녕하세요${data.userName ? `, ${data.userName}님` : ''}!</p>
            <p>M클래스 <span class="highlight">"${data.className}"</span> 신청이 성공적으로 완료되었습니다.</p>
            
            <div class="class-info">
              <h3>📚 클래스 정보</h3>
              <div class="info-row">
                <span class="label">클래스명:</span>
                <span class="value">${data.className}</span>
              </div>
              <div class="info-row">
                <span class="label">시작일시:</span>
                <span class="value">${new Date(data.classStartDate).toLocaleString('ko-KR')}</span>
              </div>
              <div class="info-row">
                <span class="label">종료일시:</span>
                <span class="value">${new Date(data.classEndDate).toLocaleString('ko-KR')}</span>
              </div>
              <div class="info-row">
                <span class="label">신청일시:</span>
                <span class="value">${new Date(data.applicationDate).toLocaleString('ko-KR')}</span>
              </div>
            </div>
            
            <p><strong>📝 다음 단계:</strong></p>
            <ul>
              <li>클래스 시작 전까지 추가 안내사항을 확인해주세요</li>
              <li>클래스 관련 문의사항이 있으시면 언제든 연락주세요</li>
              <li>클래스 시작 30분 전에 알림 이메일을 보내드릴 예정입니다</li>
            </ul>
            
            <p>감사합니다!</p>
          </div>
          
          <div class="footer">
            <p>© 2025 미니인턴(MiniIntern). All rights reserved.</p>
            <p>이 이메일은 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
미니인턴 M클래스 신청 완료 알림

안녕하세요${data.userName ? `, ${data.userName}님` : ''}!

M클래스 "${data.className}" 신청이 성공적으로 완료되었습니다.

클래스 정보:
- 클래스명: ${data.className}
- 시작일시: ${new Date(data.classStartDate).toLocaleString('ko-KR')}
- 종료일시: ${new Date(data.classEndDate).toLocaleString('ko-KR')}
- 신청일시: ${new Date(data.applicationDate).toLocaleString('ko-KR')}

감사합니다!
미니인턴 팀
    `;

    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      text
    });
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      await this.transporter.verify();
      defaultLogger.info('Email service connection verified');
      return true;
    } catch (error) {
      defaultLogger.error('Email service connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export default EmailService;