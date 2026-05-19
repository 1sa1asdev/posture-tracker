class ToastStore {
  visible = $state(false);
  message = $state('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, ms = 1600) {
    this.message = msg;
    this.visible = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.visible = false), ms);
  }
}

export const toast = new ToastStore();
