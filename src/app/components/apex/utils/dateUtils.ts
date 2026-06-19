// Simple date formatting utilities
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  
  // Handle different format strings
  if (formatStr === 'PPP') {
    return `${monthsFull[month]} ${day}, ${year}`;
  }
  
  if (formatStr === 'MMM d, yyyy') {
    return `${months[month]} ${day}, ${year}`;
  }
  
  if (formatStr === 'MMM d, yyyy HH:mm') {
    const hrs = hours.toString().padStart(2, '0');
    const mins = minutes.toString().padStart(2, '0');
    return `${months[month]} ${day}, ${year} ${hrs}:${mins}`;
  }
  
  // Default format
  return `${months[month]} ${day}, ${year}`;
}
