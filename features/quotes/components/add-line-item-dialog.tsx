"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  ResponsiveOverlayTrigger,
} from "@/components/ui/responsive-overlay";

type AddLineItemDialogProps = {
  disabled?: boolean;
  onAdd: (item: { description: string; quantity: string; unitPrice: string }) => void;
};

export function AddLineItemDialog({ disabled, onAdd }: AddLineItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const descriptionRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!description.trim()) return;

    onAdd({
      description: description.trim(),
      quantity: quantity || "1",
      unitPrice: unitPrice || "0",
    });
    reset();
    setOpen(false);
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset();
          setTimeout(() => descriptionRef.current?.focus(), 50);
        }
      }}
    >
      <ResponsiveOverlayTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Plus data-icon="inline-start" />
          Add item
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Add line item</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Enter the item details. You can edit them later.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveOverlayBody className="flex flex-col gap-5 pt-1">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-item-description">
                  Description
                </FieldLabel>
                <FieldContent>
                  <Input
                    ref={descriptionRef}
                    id="add-item-description"
                    maxLength={400}
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Logo concept package"
                    required
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="add-item-quantity">Quantity</FieldLabel>
                  <FieldContent>
                    <Input
                      id="add-item-quantity"
                      inputMode="numeric"
                      type="number"
                      min="1"
                      max="999999999"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.currentTarget.value)}
                      required
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="add-item-unit-price">
                    Unit price
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="add-item-unit-price"
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.currentTarget.value)}
                      placeholder="0.00"
                      required
                    />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </ResponsiveOverlayBody>
          <ResponsiveOverlayFooter>
            <Button type="submit" disabled={!description.trim()}>
              <Plus data-icon="inline-start" />
              Add item
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
