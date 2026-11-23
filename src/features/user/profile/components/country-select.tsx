import { inputClass } from "@/features/user/account/components/account-ui";
import { COUNTRY_CODES } from "@/lib/country-codes";

import { countryName } from "../utils/billing";

/** Country names, saved as the 2-letter ISO code ("IN"). "" means none. */
export function CountrySelect({
  id,
  value,
  onChange,
  disabled,
  autoComplete = "country",
  placeholder = "Choose a country",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}) {
  const known = !value || COUNTRY_CODES.some((country) => country.iso === value);
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {known ? null : <option value={value}>{countryName(value)}</option>}
      {COUNTRY_CODES.map((country) => (
        <option key={country.iso} value={country.iso}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
