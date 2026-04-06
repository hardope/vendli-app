import { useToastStore } from '../store/toast.store.js';

function push(type, message) {
  useToastStore.getState().addToast({ type, message });
}

const Notify = {
  success(message) {
    push('success', message);
  },
  error(message) {
    push('error', message);
  },
  info(message) {
    push('info', message);
  },
};

export default Notify;
