import { Subscription } from "@/store/subscriptionStore"
import { formatCurrencyAmount } from "@/utils/currency"

/**
 * Types of emails that can be sent to users
 */
export enum EmailType {
  RENEWAL_REMINDER = 'renewal_reminder',
  RENEWAL_ALERT = 'renewal_alert',
  TRIAL_ENDING = 'trial_ending',
  WELCOME = 'welcome'
}

/**
 * Mock function to send email notifications
 * In a real application this would connect to an email service
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; message?: string }> {
  console.log(`Email would be sent to: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body: ${body}`)
  
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  // Simulate successful email sending
  return { success: true }
}

/**
 * Get email template for a subscription renewal reminder
 */
export function getRenewalReminderEmailTemplate(
  subscription: Subscription,
  daysUntilRenewal: number
): { subject: string; body: string } {
  const formattedAmount = formatCurrencyAmount(subscription.amount, subscription.currency)
  
  // Create subject line based on days until renewal
  const subject = daysUntilRenewal === 1
    ? `Reminder: Your ${subscription.name} subscription renews tomorrow`
    : `Reminder: Your ${subscription.name} subscription renews in ${daysUntilRenewal} days`
  
  // Create email body
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
        <h1 style="color: #333;">Subscription Renewal Reminder</h1>
      </div>
      
      <div style="padding: 20px;">
        <p>Hello,</p>
        
        <p>This is a friendly reminder that your <strong>${subscription.name}</strong> subscription
        will renew ${daysUntilRenewal === 1 ? 'tomorrow' : `in ${daysUntilRenewal} days`}.</p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #0070f3; padding: 15px; margin: 20px 0;">
          <p><strong>Subscription Details:</strong></p>
          <ul style="padding-left: 20px;">
            <li>Service: ${subscription.name}</li>
            <li>Plan: ${subscription.plan}</li>
            <li>Amount: ${formattedAmount}</li>
            <li>Renewal Date: ${new Date(subscription.nextBillingDate).toLocaleDateString()}</li>
            <li>Payment Method: ${subscription.paymentMethod}</li>
          </ul>
        </div>
        
        <p>If you wish to cancel or modify your subscription, please visit the service's website before the renewal date.</p>
        
        <p>Thank you for using Subscription Manager!</p>
      </div>
      
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated message from your Subscription Manager application.</p>
        <p>You're receiving this because you enabled email notifications for your subscriptions.</p>
      </div>
    </div>
  `
  
  return { subject, body }
}

/**
 * Function to send test email
 */
export async function sendTestEmail(
  to: string
): Promise<{ success: boolean; message?: string }> {
  const subject = "Test Email from Subscription Manager"
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
        <h1 style="color: #333;">Test Notification</h1>
      </div>
      
      <div style="padding: 20px;">
        <p>Hello,</p>
        
        <p>This is a test email from your Subscription Manager application.</p>
        
        <p>If you're receiving this email, your notification settings are configured correctly.</p>
        
        <p>Thank you for using Subscription Manager!</p>
      </div>
      
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        <p>This is a test message from your Subscription Manager application.</p>
      </div>
    </div>
  `
  
  return await sendEmail(to, subject, body)
}

/**
 * Process subscription reminders - to be run on a schedule
 * In a web app this would typically be handled by a backend service
 */
export async function processReminderEmails(
  subscriptions: Subscription[],
  reminderDays: number,
  emailAddress: string
): Promise<{ success: boolean; processed: number; errors: number }> {
  let processed = 0
  let errors = 0
  
  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Process each active subscription
  for (const subscription of subscriptions) {
    if (subscription.status !== 'active') continue
    
    // Calculate days until renewal
    const renewalDate = new Date(subscription.nextBillingDate)
    renewalDate.setHours(0, 0, 0, 0)
    
    const timeDiff = renewalDate.getTime() - today.getTime()
    const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24))
    
    // Check if this subscription should trigger a reminder
    if (daysUntil === reminderDays) {
      try {
        const { subject, body } = getRenewalReminderEmailTemplate(subscription, daysUntil)
        const result = await sendEmail(emailAddress, subject, body)
        
        if (result.success) {
          processed++
        } else {
          errors++
        }
      } catch (error) {
        console.error(`Error sending reminder for ${subscription.name}:`, error)
        errors++
      }
    }
  }
  
  return { success: errors === 0, processed, errors }
}