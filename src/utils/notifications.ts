import { ExamResult } from '../types';

/**
 * Webhook & Messaging Service Integration Placeholder
 * 
 * Bu fonksiyon, bir öğrenci sınavı bitirdiğinde veya öğretmen toplu sonuç paylaştığında
 * harici bir API'ye (WhatsApp Cloud API, Telegram Bot API, Twilio, Okul SMS Sistemi
 * veya okul yönetim webhook'una) güvenli payload iletmek üzere tasarlanmıştır.
 * 
 * Gelecekteki entegrasyonlar için hazır mimari:
 * 1. .env içerisine WHATSAPP_API_TOKEN veya TELEGRAM_BOT_TOKEN tanımlayın.
 * 2. Aşağıdaki endpoint ve header ayarlarını bağlayın.
 */
export interface NotificationPayload {
  channel: 'whatsapp' | 'telegram' | 'webhook';
  recipient?: string; // Telefon no veya chat_id
  message: string;
  metadata: {
    studentName: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    duration: string;
    subjectName: string;
    topic: string;
    timestamp: string;
  };
}

export async function notifyWebhookOrMessagingService(
  result: ExamResult,
  channel: 'whatsapp' | 'telegram' | 'webhook' = 'whatsapp'
): Promise<{ success: boolean; message: string }> {
  const payload: NotificationPayload = {
    channel,
    recipient: '+905xxxxxxxxx',
    message: `🎓 MEB 4. Sınıf Sınav Bildirimi:\n${result.studentName} öğrencisi ${result.subjectName} (${result.topic}) testini tamamladı.\nSonuç: ${result.correctCount}/${result.totalQuestions} Doğru, Puan: ${result.score}, Süre: ${result.formattedDuration}.`,
    metadata: {
      studentName: result.studentName,
      score: result.score,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      duration: result.formattedDuration,
      subjectName: result.subjectName,
      topic: result.topic,
      timestamp: result.submittedAt,
    },
  };

  // Mock / Logged execution for demonstration and immediate debugging
  console.log('[NOTIFICATION PLACEHOLDER] Bildirim servisi tetiklendi:', payload);

  // İleride doğrudan server API veya webhook'a POST isteği atılabilir:
  /*
  try {
    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('Notification dispatch error:', error);
  }
  */

  return {
    success: true,
    message: `Bildirim ${channel.toUpperCase()} kuyruğuna hazırlandı (${result.studentName} - ${result.score} Puan).`,
  };
}
