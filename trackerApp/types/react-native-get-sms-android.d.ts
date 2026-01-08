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

  const SmsAndroid: {
    list(
      options: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ): void;
  };

  export default SmsAndroid;
}
