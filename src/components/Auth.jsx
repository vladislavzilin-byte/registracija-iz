import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";

export default function Auth({ onAuth }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // normalize helpers
  const normalizePhone = (p) => (p || "").replace(/\D/g, "");
  const normalizeEmail = (e) => (e || "").trim().toLowerCase();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrent(user);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const users = getUsers() || [];

    if (mode === "register") {
      if (!name.trim() || !password || !phone) {
        setError(t("fill_all_fields") || "Заполните все поля");
        return;
      }
      const existing = users.find(
        (u) =>
          normalizePhone(u.phone) === normalizePhone(phone) ||
          (u.email && normalizeEmail(u.email) === normalizeEmail(email))
      );
      if (existing) {
        setError(t("user_exists") || "Такой пользователь уже существует");
        return;
      }
      const newUser = {
        name: name.trim(),
        instagram,
        phone,
        email,
        password,
      };
      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);
      setCurrent(newUser);
      onAuth?.(newUser);
      return;
    }

    // LOGIN mode
    const id = identifier.trim();
    const normalizedIdPhone = normalizePhone(id);
    const normalizedIdEmail = normalizeEmail(id);

    const fo
