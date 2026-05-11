"use client";

const SEGMENT_CONFIG = {
  countryCode: {
    inputMode: 'numeric',
    autoComplete: 'tel-country-code',
    pattern: '[0-9]*',
  },
  local: {
    inputMode: 'tel',
    autoComplete: 'tel-national',
  },
};

function normalizeDigits(value) {
  return value.replace(/\D/g, '');
}

export default function PhoneNumberInput({
  segment,
  id,
  name,
  value,
  onChange,
  placeholder,
  className,
}) {
  const config = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.local;

  const handleChange = (event) => {
    onChange(normalizeDigits(event.target.value));
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode={config.inputMode}
      autoComplete={config.autoComplete}
      pattern={config.pattern}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}