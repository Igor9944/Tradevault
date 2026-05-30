export function customAlert(title: string, message: string) {
  if (typeof window !== 'undefined' && (window as any).showCustomAlert) {
    (window as any).showCustomAlert(title, message);
  } else {
    alert(`${title}\n\n${message}`);
  }
}

export function customConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
  if (typeof window !== 'undefined' && (window as any).showCustomConfirm) {
    (window as any).showCustomConfirm(title, message, onConfirm, onCancel);
  } else {
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  }
}
