import { regularClearNumber } from "./regularExpression";

const validationPhone = (value: string): string => {
  const inputNumbersValue = regularClearNumber(value);
  if (!inputNumbersValue) return "";

  const firstDigit = inputNumbersValue[0];
  let formattedInputValue: string;

  if (["7", "8", "9"].includes(firstDigit)) {
    const normalizedNumbers = firstDigit === "9" ? "7" + inputNumbersValue : inputNumbersValue;
    formattedInputValue = formatRussianPhone(normalizedNumbers);
  } else {
    formattedInputValue = "+" + inputNumbersValue.slice(0, 16);
  }

  return formattedInputValue;
};

const formatRussianPhone = (numbers: string): string => {
  const firstSymbols = "+7 ";
  let result = firstSymbols;
  if (numbers.length > 1) result += `(${numbers.slice(1, 4)}`;
  if (numbers.length >= 5) result += `) ${numbers.slice(4, 7)}`;
  if (numbers.length >= 8) result += `-${numbers.slice(7, 9)}`;
  if (numbers.length >= 10) result += `-${numbers.slice(9, 11)}`;

  return result;
};

export { validationPhone };
