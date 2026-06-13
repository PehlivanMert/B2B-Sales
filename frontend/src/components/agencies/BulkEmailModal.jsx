import React, { useState, useEffect } from 'react';
import { X, Send, Mail, Users, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCrm } from '../../context/CrmContext';

export default function BulkEmailModal({ recipients, onClose }) {
  const { userData, currentUser } = useAuth();
  const { batchPushCrmUpdates } = useCrm();
  const [senderAccount, setSenderAccount] = useState('info@b2b-crm.com');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, sending, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [availableSenders, setAvailableSenders] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const EMAIL_TEMPLATES = [
    {
      id: 'template_1',
      name: 'Tanışma / B2B Ortaklık Teklifi',
      subject: 'B2B Ortaklığı Fırsatı',
      message: 'Sayın Yetkili,\n\nKurumunuzla potansiyel işbirliklerimizi görüşmek isteriz.\nB2B acente portalımız üzerinden yüksek komisyon oranları ile çalışabilirsiniz.\n\nDetaylı bilgi için bize ulaşabilirsiniz.\n\nSaygılarımızla,'
    },
    {
      id: 'template_2',
      name: 'Erken Rezervasyon Kampanyası',
      subject: '2026 Erken Rezervasyon Fırsatları Başladı!',
      message: 'Değerli Acentemiz,\n\n2026 yılı erken rezervasyon kampanyamız başlamıştır.\nSistem üzerinden yeni fiyatları ve kontenjanları inceleyebilirsiniz.\n\nİyi çalışmalar dileriz.'
    },
    {
      id: 'template_3',
      name: 'Sistem Güncellemesi / Bilgilendirme',
      subject: 'B2B Portal Güncellemesi Hakkında',
      message: 'Değerli İş Ortağımız,\n\nB2B portalımızda sizlere daha iyi hizmet verebilmek adına altyapı güncellemesi yapılmıştır. Yeni özellikleri test edebilirsiniz.\n\nTeşekkürler.'
    }
  ];

  useEffect(() => {
    // Fetch configured senders from backend
    fetch('http://localhost:3001/api/senders')
      .then(res => res.json())
      .then(data => {
        if (data.senders && data.senders.length > 0) {
          setAvailableSenders(data.senders);
          setSenderAccount(data.senders[0]); // Set default to the first one
        }
      })
      .catch(err => console.error("Senders fetch error:", err));
  }, []);

  // Extract valid emails
  const validRecipients = recipients.filter(r => r.email && r.email.includes('@'));

  const handleSend = async (e) => {
    e.preventDefault();
    if (validRecipients.length === 0 || !subject || !message) return;

    try {
      setStatus('sending');
      
      // Call local Node.js backend
      const response = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: senderAccount,
          subject,
          message,
          bccList: validRecipients.map(r => r.email)
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Mail gönderilemedi.');

      // --- BATCH YAZMA OPTİMİZASYONU ---
      // Her acenteye tek tek setDoc/addDoc yazmak yerine writeBatch ile gruplu yazma yapılır.
      // Firestore max 500 doküman/batch sınırı olduğu için 500'lük gruplara bölünür.
      // Sadece durumu henüz 'contacted' olmayan acenteler güncellenir.
      const toUpdate = validRecipients.filter(a => !a.status || a.status === 'lead');
      const now = new Date();

      const entries = toUpdate.map(agency => ({
        docId: agency.docId,
        patch: { status: 'contacted', lastUpdatedAt: now }
      }));

      await batchPushCrmUpdates(entries);

      // Log to campaigns history
      await addDoc(collection(db, 'campaigns'), {
        sender: senderAccount,
        authorName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : currentUser?.email,
        authorEmail: currentUser?.email,
        subject,
        message,
        recipientCount: validRecipients.length,
        sentAt: serverTimestamp()
      });

      // Create Notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: currentUser?.uid,
        title: 'Toplu E-posta Tamamlandı',
        message: `${validRecipients.length} acenteye başarıyla mail gönderildi. (Konu: ${subject})`,
        type: 'success',
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Mocking a successful send
      setStatus('success');
      
      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error sending emails:', error);
      setStatus('error');
      setErrorMessage('E-postalar gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleMailto = () => {
    if (validRecipients.length === 0 || !subject || !message) return;
    const bccEmails = validRecipients.map(r => r.email).join(',');
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
          
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Toplu E-posta Gönderimi</h2>
                <p className="text-sm text-slate-500">Kurumsal SMTP E-Posta Sunucusu</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={status === 'sending'}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Kampanya Başarıyla Gönderildi!</h3>
                <p className="text-slate-500 max-w-sm">
                  {validRecipients.length} acenteye e-postalarınız kurumsal SMTP sunucunuz üzerinden gönderildi.
                </p>
              </div>
            ) : (
              <form id="email-form" onSubmit={handleSend} className="space-y-5">
                
                {status === 'error' && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Alıcı Listesi Özeti</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Seçilen listedeki <strong>{recipients.length}</strong> acenteden <strong>{validRecipients.length}</strong> tanesinin geçerli bir e-posta adresi bulunuyor. Gönderim sadece bu adreslere yapılacaktır.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Gönderen Hesap</label>
                  <select
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    disabled={status === 'sending'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  >
                    {availableSenders.length > 0 ? (
                      availableSenders.map(sender => (
                        <option key={sender} value={sender}>{sender}</option>
                      ))
                    ) : (
                      <option value="">Lütfen backend/.env dosyasını ayarlayın</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 ml-1">E-posta Konusu</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        const tplId = e.target.value;
                        setSelectedTemplate(tplId);
                        if (tplId) {
                          const tpl = EMAIL_TEMPLATES.find(t => t.id === tplId);
                          if (tpl) {
                            setSubject(tpl.subject);
                            setMessage(tpl.message);
                          }
                        }
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="">Şablon Seçin...</option>
                      {EMAIL_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    disabled={status === 'sending'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                    placeholder="Örn: Erken Rezervasyon B2B Ortaklığı Fırsatı"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Mesaj İçeriği</label>
                  <textarea
                    required
                    disabled={status === 'sending'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y disabled:opacity-60"
                    placeholder="Sayın yetkili,&#10;&#10;Kurumunuzla potansiyel işbirliklerimizi görüşmek isteriz..."
                  />
                  <p className="text-xs text-slate-500 ml-1">HTML tagları kullanabilirsiniz. (Örn: &lt;br&gt;, &lt;strong&gt;)</p>
                </div>
              </form>
            )}
          </div>

          {status !== 'success' && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={status === 'sending'}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={handleMailto}
                disabled={validRecipients.length === 0 || status === 'sending'}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Yerel E-Posta (Mailto)
              </button>
              <button
                type="submit"
                form="email-form"
                disabled={validRecipients.length === 0 || status === 'sending'}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gönder ({validRecipients.length})
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
