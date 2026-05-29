import type { FC } from "hono/jsx";

// Form primitives — ports of components/form/*.templ. The design-system
// classes (search-shell, peer styles, rating-row) come from tokens.css.

export const FormLabel: FC<{ forId?: string; text: string; required?: boolean; optional?: boolean }> = ({
  forId,
  text,
  required,
  optional,
}) => (
  <label for={forId} class="block text-xs text-ink-mute mb-1.5">
    {text}
    {required ? <span class="text-danger ml-0.5">*</span> : optional ? <span class="text-ink-faint ml-1">(optional)</span> : null}
  </label>
);

// ---- RadioGroup ----
export type RadioOption = { value: string; label: string };

const RadioPills: FC<{ name: string; options: RadioOption[]; selected: string }> = ({ name, options, selected }) => (
  <div class="flex flex-wrap gap-2">
    {options.map((opt) => (
      <label class="cursor-pointer">
        <input type="radio" name={name} value={opt.value} class="sr-only peer" checked={opt.value === selected} />
        <span class="inline-block border border-hairline-strong text-ink-mute px-4 py-2 text-sm tracking-tight transition-colors peer-checked:bg-ink peer-checked:text-parchment peer-checked:border-ink hover:text-ink">
          {opt.label}
        </span>
      </label>
    ))}
  </div>
);

const RadioList: FC<{ name: string; options: RadioOption[]; selected: string }> = ({ name, options, selected }) => (
  <div class="flex flex-col gap-3">
    {options.map((opt) => (
      <label class="flex items-start gap-3 cursor-pointer">
        <input type="radio" name={name} value={opt.value} class="sr-only peer" checked={opt.value === selected} />
        <span class="mt-0.5 w-4 h-4 rounded-full border border-ink-mute flex items-center justify-center peer-checked:border-marigold peer-checked:bg-marigold transition-colors flex-shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-parchment opacity-0 peer-checked:opacity-100" />
        </span>
        <span class="text-sm leading-snug">{opt.label}</span>
      </label>
    ))}
  </div>
);

export const RadioGroup: FC<{ name: string; options: RadioOption[]; selected: string; layout: "pills" | "list" }> = ({
  name,
  options,
  selected,
  layout,
}) =>
  layout === "pills" ? (
    <RadioPills name={name} options={options} selected={selected} />
  ) : (
    <RadioList name={name} options={options} selected={selected} />
  );

// ---- NumberInput ----
export type NumberInputProps = {
  id?: string;
  name: string;
  value: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: string;
};

export const NumberInput: FC<NumberInputProps> = (p) => {
  let cls =
    "num search-shell w-full bg-white border border-hairline px-4 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-marigold";
  if (p.error) cls += " border-danger";
  return (
    <div>
      <input
        id={p.id}
        type="number"
        name={p.name}
        value={p.value}
        placeholder={p.placeholder}
        min={p.min}
        max={p.max}
        step={p.step}
        inputmode="numeric"
        class={cls}
        autocomplete="off"
      />
      {p.error ? (
        <div class="text-xs text-danger mt-1.5">{p.error}</div>
      ) : p.helper ? (
        <div class="text-xs text-ink-faint mt-1.5">{p.helper}</div>
      ) : null}
    </div>
  );
};

// ---- TextInput ----
export type TextInputProps = {
  id?: string;
  name: string;
  value: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  numeric?: boolean;
  type?: string;
  autofocus?: boolean;
};

export const TextInput: FC<TextInputProps> = (p) => {
  let cls =
    "search-shell w-full bg-white border border-hairline px-4 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-marigold";
  if (p.numeric) cls = "num " + cls;
  if (p.error) cls += " border-danger";
  return (
    <div>
      <input
        id={p.id}
        type={p.type ?? "text"}
        name={p.name}
        value={p.value}
        placeholder={p.placeholder}
        class={cls}
        autofocus={p.autofocus}
        autocomplete="off"
      />
      {p.error ? (
        <div class="text-xs text-danger mt-1.5">{p.error}</div>
      ) : p.helper ? (
        <div class="text-xs text-ink-faint mt-1.5">{p.helper}</div>
      ) : null}
    </div>
  );
};

// ---- Textarea (+ CounterScript) ----
export type TextareaProps = {
  id?: string;
  name: string;
  value: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  rows?: number;
  maxChars?: number;
};

export const Textarea: FC<TextareaProps> = (p) => {
  const targetId = p.id ?? p.name;
  let cls =
    "search-shell w-full bg-white border border-hairline px-4 py-3 text-sm outline-none placeholder:text-ink-faint resize-none focus:border-marigold";
  if (p.error) cls += " border-danger";
  const max = p.maxChars ?? 0;
  return (
    <div>
      <textarea
        id={p.id}
        name={p.name}
        rows={p.rows && p.rows > 0 ? p.rows : 3}
        placeholder={p.placeholder}
        class={cls}
        maxlength={max > 0 ? max : undefined}
        data-charcount={max > 0 ? "1" : undefined}
      >
        {p.value}
      </textarea>
      {max > 0 ? (
        <div
          class="text-xs text-ink-faint mt-1.5 num"
          id={`${targetId}-counter`}
          data-charcount-for={targetId}
          data-charcount-max={String(max)}
        >
          {`${[...p.value].length} / ${max}`}
        </div>
      ) : null}
      {p.error ? (
        <div class="text-xs text-danger mt-1.5">{p.error}</div>
      ) : p.helper ? (
        <div class="text-xs text-ink-faint mt-1.5">{p.helper}</div>
      ) : null}
    </div>
  );
};

const COUNTER_SCRIPT = `
(function(){
  document.querySelectorAll('[data-charcount-for]').forEach(function(el){
    var targetID = el.getAttribute('data-charcount-for');
    var max = parseInt(el.getAttribute('data-charcount-max'), 10) || 0;
    var ta = document.getElementById(targetID);
    if (!ta) return;
    var update = function(){ el.textContent = ta.value.length + ' / ' + max; };
    ta.addEventListener('input', update);
    update();
  });
})();
`;

export const CounterScript: FC = () => <script dangerouslySetInnerHTML={{ __html: COUNTER_SCRIPT }} />;

// ---- Select ----
export type SelectOption = { value: string; label: string };
export type SelectProps = {
  id?: string;
  name: string;
  value: string;
  options: SelectOption[];
  helper?: string;
  error?: string;
  hasEmpty?: boolean;
  emptyLbl?: string;
};

export const Select: FC<SelectProps> = (p) => {
  let cls = "w-full bg-white border border-hairline px-4 py-3 text-sm outline-none appearance-none pr-10 focus:border-marigold";
  if (p.error) cls += " border-danger";
  return (
    <div>
      <div class="relative">
        <select id={p.id} name={p.name} class={cls}>
          {p.hasEmpty ? (
            <option value="" selected={p.value === ""}>
              {p.emptyLbl ?? "—"}
            </option>
          ) : null}
          {p.options.map((opt) => (
            <option value={opt.value} selected={opt.value === p.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint"
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
        </svg>
      </div>
      {p.error ? (
        <div class="text-xs text-danger mt-1.5">{p.error}</div>
      ) : p.helper ? (
        <div class="text-xs text-ink-faint mt-1.5">{p.helper}</div>
      ) : null}
    </div>
  );
};

// ---- Rating (1–5 star CSS-only widget; see tokens.css §rating-row) ----
const ratingTitle = (n: number): string =>
  ({ 1: "1 — poor", 2: "2 — mixed", 3: "3 — good", 4: "4 — very good", 5: "5 — excellent" })[n] ?? "";

export const Rating: FC<{ name: string; selected: number }> = ({ name, selected }) => (
  <div class="rating-row" data-name={name}>
    {[5, 4, 3, 2, 1].map((n) => (
      <>
        <input type="radio" id={`${name}-${n}`} name={name} value={String(n)} checked={selected === n} />
        <label for={`${name}-${n}`} title={ratingTitle(n)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="block">
            <path d="M12 2l2.9 6.6L22 9.7l-5.3 4.7L18.2 22 12 18.3 5.8 22l1.5-7.6L2 9.7l7.1-1.1L12 2z" />
          </svg>
        </label>
      </>
    ))}
  </div>
);

// ---- Checkbox ----
export const Checkbox: FC<{
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
}> = ({ name, value, checked, label, description }) => (
  <label class="flex items-start gap-3 cursor-pointer group">
    <input type="checkbox" name={name} value={value === "" ? "on" : value} class="sr-only peer" checked={checked} />
    <span class="mt-0.5 w-4 h-4 border border-ink-mute flex items-center justify-center peer-checked:bg-ink peer-checked:border-ink transition-colors flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="text-parchment opacity-0 peer-checked:opacity-100">
        <path d="M2 5l2 2 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" />
      </svg>
    </span>
    <span class="text-sm leading-snug">
      <span class="text-ink">{label}</span>
      {description ? <span class="block text-ink-mute text-xs mt-1 leading-relaxed">{description}</span> : null}
    </span>
  </label>
);
