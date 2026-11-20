import { regularClearNumber } from "@/APP/store/utils/regularExpression";

const validationLoginData = (phone: string, password: string) => {
  if (phone === "" || password === "") return false;
  return true;
};

const validationRegistrationData = (phone: string) => {
  const inputNumbersValue = regularClearNumber(phone);
  return inputNumbersValue?.length > 10;
};

const validationCodeConfirm = (value: string[]): boolean => {
  const str = value.join("");
  return str.length === value.length;
};

const validatorPassword = (passwor: string) => {
  const hasUppercase = /[A-Z]/.test(passwor);
  const hasLowercase = /[a-z]/.test(passwor);
  const hasDigit = /\d/.test(passwor);
  const hasValidLengthAndNoWhitespace = /^\S{8,}$/.test(passwor);
  return hasValidLengthAndNoWhitespace && hasUppercase && hasLowercase && hasDigit;
};

export {
  validationLoginData,
  validationRegistrationData,
  validationCodeConfirm,
  validatorPassword,
};
