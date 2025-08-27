
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Toaster = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast.info(msg),
  warning: (msg) => toast.warning(msg),
};

export default Toaster;
