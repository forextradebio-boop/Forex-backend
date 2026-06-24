export class EmailService {
  static async sendEmail(to: string, subject: string, body: string) {
    // Connect to SendGrid, AWS SES or similar
    console.log(`Sending email to ${to}: ${subject}`);
  }
}
