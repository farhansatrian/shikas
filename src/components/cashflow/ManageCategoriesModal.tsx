import React, { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  getColorGroupLabel,
  getDefaultColorName,
  INCOME_ACCENT_COLOR,
  isSystemCategoryId,
  normalizeHexColor,
} from "../../data/categories";
import type { CategoryDefinition } from "../../types/cashflow";
import { CategoryIcon } from "../common/CategoryIcon";

export const ManageCategoriesModal: React.FC = () => {
  const {
    isCategoriesModalOpen,
    categoriesModalTab,
    closeCategoriesModal,
    store,
    saveCategory,
    deleteCategory,
    resetCategoriesToDefault,
    setColorLabel,
    t,
    locale,
  } = useCashflow();

  const [activeType, setActiveType] = useState<"expense" | "income">("expense");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2276a8");
  const [icon, setIcon] = useState<string>("Tag");
  const [colorLabelDraft, setColorLabelDraft] = useState("");
  const [colorLabelSaved, setColorLabelSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorLabels = store.settings.colorLabels ?? {};

  const syncColorDraftForHex = (hex: string) => {
    const norm = normalizeHexColor(hex);
    setColorLabelDraft(colorLabels[norm] ?? "");
    setColorLabelSaved(false);
  };

  const commitColorLabelDraft = (targetHex: string, draftValue: string) => {
    const norm = normalizeHexColor(targetHex);
    const currentStored = colorLabels[norm] ?? "";
    const trimmed = draftValue.trim().slice(0, 32);
    const defaultName = getDefaultColorName(norm);
    const effective =
      trimmed.toLowerCase() === defaultName.toLowerCase() ? "" : trimmed;
    if (effective !== currentStored) {
      setColorLabel(norm, effective);
      setColorLabelSaved(true);
    }
    setColorLabelDraft(effective);
  };

  const resetForm = (tab: "expense" | "income" = activeType) => {
    const nextColor = tab === "income" ? INCOME_ACCENT_COLOR : "#2276a8";
    setEditingId(null);
    setName("");
    setColor(nextColor);
    setIcon(tab === "income" ? "Briefcase" : "Tag");
    setColorLabelDraft(colorLabels[normalizeHexColor(nextColor)] ?? "");
    setColorLabelSaved(false);
    setError(null);
  };

  useEffect(() => {
    if (!isCategoriesModalOpen) return;
    setActiveType(categoriesModalTab);
    resetForm(categoriesModalTab);
  }, [isCategoriesModalOpen, categoriesModalTab]);

  useEffect(() => {
    if (!isCategoriesModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCategoriesModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCategoriesModalOpen, closeCategoriesModal]);

  const txCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of store.transactions) {
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [store.transactions]);

  const visibleCategories = useMemo(
    () => store.categories.filter((c) => c.type === activeType),
    [store.categories, activeType]
  );

  if (!isCategoriesModalOpen) return null;

  const isExpenseTab = activeType === "expense";
  const normSelectedColor = normalizeHexColor(color);
  const defaultSelectedColorName = getDefaultColorName(normSelectedColor);
  const storedSelectedColorLabel = colorLabels[normSelectedColor] ?? "";
  const isColorDraftDirty = colorLabelDraft.trim() !== storedSelectedColorLabel;

  const handleClose = () => {
    if (isExpenseTab && isColorDraftDirty) {
      commitColorLabelDraft(normSelectedColor, colorLabelDraft);
    }
    closeCategoriesModal();
  };

  const handleSelectColor = (nextHex: string) => {
    if (isColorDraftDirty) {
      commitColorLabelDraft(normSelectedColor, colorLabelDraft);
    }
    const normNext = normalizeHexColor(nextHex);
    setColor(normNext);
    syncColorDraftForHex(normNext);
  };

  const startEdit = (cat: CategoryDefinition) => {
    if (isExpenseTab && isColorDraftDirty) {
      commitColorLabelDraft(normSelectedColor, colorLabelDraft);
    }
    setEditingId(cat.id);
    setName(cat.nameEn || cat.nameId);
    const nextColor =
      cat.type === "income" ? INCOME_ACCENT_COLOR : normalizeHexColor(cat.color);
    setColor(nextColor);
    setIcon(cat.icon);
    if (cat.type === "expense") {
      syncColorDraftForHex(nextColor);
    }
    setError(null);
  };

  const switchTab = (next: "expense" | "income") => {
    if (isExpenseTab && isColorDraftDirty) {
      commitColorLabelDraft(normSelectedColor, colorLabelDraft);
    }
    setActiveType(next);
    resetForm(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpenseTab && isColorDraftDirty) {
      commitColorLabelDraft(normSelectedColor, colorLabelDraft);
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.categories.nameRequired);
      return;
    }

    const dup = visibleCategories.some(
      (c) =>
        c.id !== editingId &&
        (c.nameEn.toLowerCase() === trimmed.toLowerCase() ||
          c.nameId.toLowerCase() === trimmed.toLowerCase())
    );
    if (dup) {
      setError(t.categories.duplicateError);
      return;
    }

    saveCategory(
      {
        type: activeType,
        name: trimmed,
        color: isExpenseTab ? normSelectedColor : INCOME_ACCENT_COLOR,
        icon,
      },
      editingId ?? undefined
    );
    resetForm(activeType);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.categories.modalTitle}
        className="vn-dialogue animate-modal-in my-auto flex max-h-[92vh] w-full max-w-[580px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Watercolor Band Header */}
        <div className="shikas-band-strip flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 text-white">
          <span className="truncate font-mono text-[10.5px] font-semibold tracking-[0.18em] uppercase drop-shadow-2xs">
            {t.categories.modalTitle}
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t.actions.close}
            className="inline-flex shrink-0 items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* 2-Tab Type Switcher: EXPENSE | INCOME */}
          <div className="grid grid-cols-2 border border-[#745bc7]">
            <button
              type="button"
              onClick={() => switchTab("expense")}
              className={`border-r border-[#745bc7] py-2 font-mono text-[10.5px] font-bold tracking-[0.12em] uppercase transition ${
                activeType === "expense"
                  ? "bg-[#d749d5]/16 text-[#c837a5]"
                  : "bg-white text-[#5d5370] hover:bg-[#f5effe] hover:text-[#14100e]"
              }`}
            >
              {activeType === "expense" ? "▶ " : ""}- {t.categories.expenseTab} (
              {store.categories.filter((c) => c.type === "expense").length})
            </button>
            <button
              type="button"
              onClick={() => switchTab("income")}
              className={`py-2 font-mono text-[10.5px] font-bold tracking-[0.12em] uppercase transition ${
                activeType === "income"
                  ? "bg-[#2276a8]/15 text-[#2276a8]"
                  : "bg-white text-[#5d5370] hover:bg-[#f5effe] hover:text-[#14100e]"
              }`}
            >
              {activeType === "income" ? "▶ " : ""}+ {t.categories.incomeTab} (
              {store.categories.filter((c) => c.type === "income").length})
            </button>
          </div>

          {/* 1. Active Categories List */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
                {t.categories.activeList} ({visibleCategories.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.categories.confirmReset)) {
                    resetCategoriesToDefault();
                    resetForm(activeType);
                  }
                }}
                className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold tracking-[0.1em] text-[#5d5370] uppercase transition hover:text-[#745bc7]"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{t.categories.resetDefaultBtn}</span>
              </button>
            </div>

            <ul className="divide-y divide-[#745bc7]/15 border border-[#745bc7]/35 bg-white">
              {visibleCategories.map((cat) => {
                const count = txCountByCategory.get(cat.id) ?? 0;
                const isSys = isSystemCategoryId(cat.id);
                const label = cat.nameEn || cat.nameId;
                const colorGroupTag =
                  cat.type === "expense"
                    ? getColorGroupLabel(cat.color, colorLabels)
                    : null;
                return (
                  <li
                    key={cat.id}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 ${
                      editingId === cat.id ? "bg-[#f4effe]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {cat.type === "income" ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#2276a8]/55 bg-[#2276a8]/8 text-[#2276a8]">
                          <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center border text-white"
                          style={{
                            borderColor: cat.color,
                            backgroundColor: cat.color,
                          }}
                        >
                          <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-mono text-xs font-bold text-[#14100e]">
                            {label}
                          </span>
                          {colorGroupTag && (
                            <span
                              className="border px-1 py-0.2 font-mono text-[8px] font-semibold tracking-[0.06em]"
                              style={{
                                borderColor: `${cat.color}45`,
                                backgroundColor: `${cat.color}10`,
                                color: cat.color,
                              }}
                            >
                              {colorGroupTag}
                            </span>
                          )}
                          {isSys && (
                            <span
                              title={t.categories.systemHint}
                              className="border border-[#745bc7]/40 bg-[#f5effe] px-1 py-0.2 font-mono text-[8px] font-bold tracking-[0.1em] text-[#745bc7] uppercase"
                            >
                              {t.categories.systemBadge}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-[#5d5370]">
                          {count}{" "}
                          {locale === "id"
                            ? "catatan"
                            : count === 1
                              ? "entry"
                              : "entries"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        aria-label={t.actions.edit}
                        className="p-1.5 text-[#5d5370] transition hover:text-[#745bc7]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {!isSys && (
                        <button
                          type="button"
                          onClick={() => {
                            const msg =
                              count > 0
                                ? t.categories.confirmDeleteWithEntries
                                : t.categories.confirmDeleteEmpty;
                            if (window.confirm(msg)) {
                              deleteCategory(cat.id);
                              if (editingId === cat.id) resetForm(activeType);
                            }
                          }}
                          aria-label={t.actions.delete}
                          className="p-1.5 text-[#5d5370] transition hover:text-[#c837a5]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 2. Add / Edit Category Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3.5 border border-[#745bc7]/40 bg-white/95 p-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#745bc7]/15 pb-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
                ▶{" "}
                {editingId ? t.categories.editTitle : t.categories.addTitle}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm(activeType)}
                  className="font-mono text-[10px] font-semibold text-[#5d5370] underline hover:text-[#14100e]"
                >
                  {t.actions.cancel}
                </button>
              )}
            </div>

            {/* Name (+ Expense Color Group Swatches & Custom Color Label) */}
            <div
              className={`grid grid-cols-1 gap-3 ${
                isExpenseTab ? "sm:grid-cols-[1fr_auto]" : ""
              }`}
            >
              <div>
                <label className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                  {t.categories.nameLabel}
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder={t.categories.namePlaceholder}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="mt-1.5 w-full border border-[#745bc7]/40 bg-white px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7]"
                />
              </div>

              {isExpenseTab && (
                <div>
                  <span className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                    {t.categories.colorLabel}
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 py-1">
                    {CATEGORY_COLORS.map((swatch) => {
                      const swatchLabel = getColorGroupLabel(
                        swatch.hex,
                        colorLabels
                      );
                      const isActive = normSelectedColor === swatch.hex;
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          title={swatchLabel}
                          onClick={() => handleSelectColor(swatch.hex)}
                          aria-label={swatchLabel}
                          className={`h-6 w-6 border transition ${
                            isActive
                              ? "scale-110 border-[#14100e] ring-2 ring-[#745bc7]/35"
                              : "border-white/60 opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Expense Color Group Label (shows on Cashflow Log Color Filter) */}
            {isExpenseTab && (
              <div className="border border-[#745bc7]/25 bg-[#faf7ff] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="shikas-color-group-name"
                    className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold tracking-[0.12em] text-[#5d5370] uppercase"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 border border-black/15"
                      style={{ backgroundColor: normSelectedColor }}
                    />
                    <span>
                      {locale === "id"
                        ? `NAMA GRUP WARNA (${defaultSelectedColorName})`
                        : `COLOR GROUP NAME (${defaultSelectedColorName})`}
                    </span>
                  </label>
                  {storedSelectedColorLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        setColorLabel(normSelectedColor, "");
                        setColorLabelDraft("");
                        setColorLabelSaved(false);
                      }}
                      className="font-mono text-[9px] font-semibold text-[#5d5370] underline hover:text-[#c837a5]"
                    >
                      {locale === "id"
                        ? `Reset ke ${defaultSelectedColorName}`
                        : `Reset to ${defaultSelectedColorName}`}
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    id="shikas-color-group-name"
                    type="text"
                    maxLength={32}
                    placeholder={`${defaultSelectedColorName} (${
                      locale === "id"
                        ? "cth. Needs, Mobility, Lifestyle"
                        : "e.g. Needs, Mobility, Lifestyle"
                    })`}
                    value={colorLabelDraft}
                    onChange={(e) => {
                      setColorLabelDraft(e.target.value);
                      if (colorLabelSaved) setColorLabelSaved(false);
                    }}
                    onBlur={() =>
                      commitColorLabelDraft(normSelectedColor, colorLabelDraft)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitColorLabelDraft(normSelectedColor, colorLabelDraft);
                      }
                    }}
                    className="w-full min-w-0 border border-[#745bc7]/35 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#14100e] outline-none transition placeholder:text-[#5d5370]/60 focus:border-[#745bc7]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      commitColorLabelDraft(normSelectedColor, colorLabelDraft)
                    }
                    disabled={!isColorDraftDirty}
                    className={`inline-flex shrink-0 items-center gap-1 border px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.08em] uppercase transition ${
                      isColorDraftDirty
                        ? "border-[#745bc7] bg-[#745bc7] text-white hover:bg-[#5e46ad]"
                        : colorLabelSaved
                          ? "border-[#1f8f6b]/45 bg-[#1f8f6b]/10 text-[#1f8f6b]"
                          : "border-[#745bc7]/25 bg-white text-[#5d5370]/55"
                    }`}
                  >
                    {colorLabelSaved && !isColorDraftDirty && (
                      <Check className="h-3 w-3" />
                    )}
                    <span>
                      {colorLabelSaved && !isColorDraftDirty
                        ? locale === "id"
                          ? "TERSIMPAN"
                          : "SAVED"
                        : t.actions.save}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Icon Picker Grid */}
            <div>
              <span className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                {t.categories.iconLabel}
              </span>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-9">
                {CATEGORY_ICONS.map((iconName) => {
                  const selected = icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      aria-label={iconName}
                      className={`flex h-9 w-full items-center justify-center border transition sm:h-8 ${
                        selected
                          ? isExpenseTab
                            ? "border-[#14100e] text-white shadow-[2px_2px_0_0_rgba(116,91,199,0.28)]"
                            : "border-[#2276a8] bg-[#2276a8]/14 text-[#2276a8] shadow-[2px_2px_0_0_rgba(34,118,168,0.2)]"
                          : "border-[#745bc7]/25 bg-white text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                      }`}
                      style={
                        selected && isExpenseTab
                          ? {
                              backgroundColor: normSelectedColor,
                              borderColor: normSelectedColor,
                            }
                          : undefined
                      }
                    >
                      <CategoryIcon name={iconName} className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#c837a5]">
                ! {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="vn-btn-action px-4 py-2"
              >
                {t.actions.close}
              </button>
              <button type="submit" className="vn-btn-band px-5 py-2">
                <span>▶</span>
                <span>
                  {editingId ? t.actions.save : t.actions.addCategory}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
