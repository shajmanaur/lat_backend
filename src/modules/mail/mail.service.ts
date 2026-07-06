import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendWelcomeEmail(to: string, role: string, username: string, passwordRaw: string, adminName: string, schoolName: string) {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <div style="text-align: right; padding: 20px;">
          <img src="https://sas.org.in/wp-content/uploads/2021/04/sas-logo.png" alt="Sri Aurobindo Society" height="50" style="display: block; margin-left: auto;" />
          <div style="color: #E25B35; font-size: 24px; font-family: 'Brush Script MT', cursive; margin-top: 5px;">Rupantar</div>
          <div style="font-size: 10px; letter-spacing: 1px; color: #666;">TRANSFORMING EDUCATION</div>
        </div>
        
        <div style="padding: 20px;">
          <p style="color: #4A63B0;">Dear ${role.toUpperCase()},</p>
          
          <p style="color: #4A63B0;">Welcome to the LAT Dashboard!</p>
          
          <p style="color: #4A63B0;">You can use the following login credentials to access the LAT Dashboard. Through this platform, you will be able to upload, review, share, and maintain records seamlessly.</p>
          
          <p style="color: #4A63B0;">WebSite URL: <span style="background-color: yellow; padding: 2px 4px;"><a href="https://reports.rupantar.in/login" style="color: #333; text-decoration: none;">https://reports.rupantar.in/login</a></span></p>
          
          <div style="margin: 20px 0; color: #4A63B0;">
            <p style="margin: 5px 0;"><strong>User Name:</strong> <span style="background-color: yellow; padding: 2px 4px; color: #333;">${username}</span></p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <span style="background-color: yellow; padding: 2px 4px; color: #333;">${passwordRaw}</span></p>
            <p style="margin: 5px 0;"><strong>UpdatedBy:</strong> <span style="background-color: yellow; padding: 2px 4px; color: #333;">${adminName} (ADMIN)</span></p>
            <p style="margin: 5px 0;"><strong>School:</strong> <span style="background-color: yellow; padding: 2px 4px; color: #333;">${schoolName}</span></p>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="https://reports.rupantar.in/login" style="background-color: #FA9A6F; color: #4A63B0; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Log In</a>
          </div>
          
          <p style="color: #4A63B0;">For any assistance, feel free to contact us.</p>
          
          <p style="color: #4A63B0; margin-top: 30px;">
            Warm regards,<br>
            Sri Aurobindo Society
          </p>
        </div>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"LAT Dashboard" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: to,
        subject: `Welcome to LAT Dashboard - ${role} Credentials`,
        html: htmlTemplate,
      });

      this.logger.log(`Welcome email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
