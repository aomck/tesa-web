import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * แปลงวันที่เป็นรูปแบบภาษาไทย
 * @param date - วันที่ที่ต้องการแปลง (string | Date)
 * @param formatString - รูปแบบการแสดงผล (default: 'd MMMM yyyy HH:mm:ss')
 * @returns วันที่ในรูปแบบภาษาไทย พ.ศ.
 *
 * @example
 * formatThaiDate('2024-10-06T11:20:20') // "6 ตุลาคม 2567 11:20:20"
 * formatThaiDate(new Date(), 'd MMM yyyy') // "6 ต.ค. 2567"
 */
export const formatThaiDate = (
  date: string | Date,
  formatString: string = 'd MMMM yyyy HH:mm:ss'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // ลดเวลา 7 ชั่วโมงเพื่อแปลงเป็นเวลาประเทศไทย (GMT+7)
  const thailandTime = new Date(dateObj.getTime() - (7 * 60 * 60 * 1000));

  // แปลง ค.ศ. เป็น พ.ศ. (เพิ่ม 543 ปี)
  const buddhistYear = thailandTime.getFullYear() + 543;
  const dateWithBuddhistYear = new Date(thailandTime);
  dateWithBuddhistYear.setFullYear(buddhistYear);

  return format(dateWithBuddhistYear, formatString, { locale: th });
};

/**
 * แปลงวันที่เป็นรูปแบบสั้น (วัน เดือน ปี)
 * @param date - วันที่ที่ต้องการแปลง
 * @returns เช่น "6 ต.ค. 2567"
 */
export const formatThaiDateShort = (date: string | Date): string => {
  return formatThaiDate(date, 'd MMM yyyy');
};

/**
 * แปลงวันที่เป็นรูปแบบเต็ม (วัน เดือน ปี เวลา)
 * @param date - วันที่ที่ต้องการแปลง
 * @returns เช่น "6 ตุลาคม 2567 11:20:20"
 */
export const formatThaiDateTime = (date: string | Date): string => {
  return formatThaiDate(date, 'd MMMM yyyy HH:mm:ss');
};

/**
 * แปลงวันที่เป็นรูปแบบเฉพาะเวลา
 * @param date - วันที่ที่ต้องการแปลง
 * @returns เช่น "11:20:20"
 */
export const formatThaiTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // ลดเวลา 7 ชั่วโมงเพื่อแปลงเป็นเวลาประเทศไทย (GMT+7)
  const thailandTime = new Date(dateObj.getTime() - (7 * 60 * 60 * 1000));

  return format(thailandTime, 'HH:mm:ss');
};

/**
 * แปลงวันที่เป็นรูปแบบวันเดือนปี เวลา (แบบสั้น)
 * @param date - วันที่ที่ต้องการแปลง
 * @returns เช่น "6 ต.ค. 2567 11:20"
 */
export const formatThaiDateTimeShort = (date: string | Date): string => {
  return formatThaiDate(date, 'd MMM yyyy HH:mm');
};
