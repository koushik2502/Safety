declare module 'react-native-get-sms-android' {
  interface Sms {
    _id: number;
    address: string;
    body: string;
    date: number;
    dateSent: number;
    read: number;
    seen: number;
    serviceCenter: string;
    subject: string;
    threadId: number;
    type: number;
  }

  interface Options {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued' | 'all';
    read?: number;
    limit?: number;
    maxCount?: number;
    startDate?: number;
    endDate?: number;
  }
  const transferOldMessages = () => {
   SmsAndroid.list(
    JSON.stringify({ box: 'inbox', maxCount: 10 }),
    (fail) => console.log(fail),
    (count, smsList) => {
      const messages = JSON.parse(smsList);
      messages.forEach((msg: any) => {
        // Instead of LockModule.sendSMS, we call the Dashboard link
        sendToDashboard(msg); 
      });
    }
   );
  };
  const SmsAndroid: {
    list(
      options: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ): void;
  };

  export default SmsAndroid;
}
