"use client";

import { useState, useOptimistic, useTransition } from "react";
import type {
  SerializedMenuSection,
  SerializedMenuItemGroup,
} from "@/actions/menus";
import {
  createMenuItemGroup,
  updateMenuItemGroup,
  deleteMenuItemGroup,
  reorderMenuItemGroups,
} from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { GroupItemsManager } from "./group-items-manager";

interface MenuItemGroupsManagerProps {
  section: SerializedMenuSection;
  restaurantId: string;
  onUpdate: () => void;
}

type OptimisticAction =
  | { type: "add"; group: SerializedMenuItemGroup }
  | { type: "update"; groupId: string; data: Partial<SerializedMenuItemGroup> }
  | { type: "delete"; groupId: string }
  | { type: "reorder"; groups: { id: string; order: number }[] };

export function MenuItemGroupsManager({
  section,
  restaurantId,
  onUpdate,
}: MenuItemGroupsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const groups = section.menuItemGroups || [];

  // Optimistic state for groups
  const [optimisticGroups, addOptimisticAction] = useOptimistic(
    groups,
    (state: SerializedMenuItemGroup[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.group];
        case "update":
          return state.map((g) =>
            g.id === action.groupId ? { ...g, ...action.data } : g
          );
        case "delete":
          return state.filter((g) => g.id !== action.groupId);
        case "reorder":
          const orderMap = new Map(action.groups.map((g) => [g.id, g.order]));
          return [...state].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
          );
        default:
          return state;
      }
    }
  );

  // UI state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set(groups.map((g) => g.id))
  );

  // Form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      alert("El nombre del grupo es obligatorio");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticGroup: SerializedMenuItemGroup = {
      id: tempId,
      menuSectionId: section.id,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || null,
      order: optimisticGroups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      menuItems: [],
    };

    startTransition(async () => {
      addOptimisticAction({ type: "add", group: optimisticGroup });

      const result = await createMenuItemGroup({
        menuSectionId: section.id,
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        order: groups.length,
      });

      if (result.success) {
        setNewGroupName("");
        setNewGroupDescription("");
        setIsAddingGroup(false);
        // Expand the new group
        if (result.group) {
          setExpandedGroupIds((prev) => new Set([...prev, result.group!.id]));
        }
        onUpdate();
      } else {
        alert(result.error || "Error al crear el grupo");
      }
    });
  };

  const handleStartEdit = (groupId: string) => {
    const group = optimisticGroups.find((g) => g.id === groupId);
    if (group) {
      setEditGroupName(group.name);
      setEditGroupDescription(group.description || "");
      setEditingGroupId(groupId);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingGroupId || !editGroupName.trim()) return;

    const updatedData = {
      name: editGroupName.trim(),
      description: editGroupDescription.trim() || null,
    };

    startTransition(async () => {
      addOptimisticAction({
        type: "update",
        groupId: editingGroupId,
        data: updatedData,
      });

      const result = await updateMenuItemGroup(editingGroupId, {
        name: updatedData.name,
        description: updatedData.description || undefined,
      });

      if (result.success) {
        setEditingGroupId(null);
        onUpdate();
      } else {
        alert(result.error || "Error al actualizar el grupo");
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditGroupName("");
    setEditGroupDescription("");
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroupId) return;

    startTransition(async () => {
      addOptimisticAction({ type: "delete", groupId: deletingGroupId });

      const result = await deleteMenuItemGroup(deletingGroupId);
      if (result.success) {
        setDeletingGroupId(null);
        onUpdate();
      } else {
        alert(result.error || "Error al eliminar el grupo");
      }
    });
  };

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleMoveUp = async (groupId: string) => {
    const currentIndex = optimisticGroups.findIndex((g) => g.id === groupId);
    if (currentIndex <= 0) return;

    const newGroups = [...optimisticGroups];
    const temp = newGroups[currentIndex];
    newGroups[currentIndex] = newGroups[currentIndex - 1];
    newGroups[currentIndex - 1] = temp;

    const updates = newGroups.map((group, index) => ({
      id: group.id,
      order: index,
    }));

    startTransition(async () => {
      addOptimisticAction({ type: "reorder", groups: updates });

      const result = await reorderMenuItemGroups(updates);
      if (result.success) {
        onUpdate();
      }
    });
  };

  const handleMoveDown = async (groupId: string) => {
    const currentIndex = optimisticGroups.findIndex((g) => g.id === groupId);
    if (currentIndex >= optimisticGroups.length - 1) return;

    const newGroups = [...optimisticGroups];
    const temp = newGroups[currentIndex];
    newGroups[currentIndex] = newGroups[currentIndex + 1];
    newGroups[currentIndex + 1] = temp;

    const updates = newGroups.map((group, index) => ({
      id: group.id,
      order: index,
    }));

    startTransition(async () => {
      addOptimisticAction({ type: "reorder", groups: updates });

      const result = await reorderMenuItemGroups(updates);
      if (result.success) {
        onUpdate();
      }
    });
  };

  return (
    <div className="space-y-3 mt-4">
      {/* Groups List */}
      {optimisticGroups.length === 0 && !isAddingGroup && (
        <div className="text-center py-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          <FolderOpen className="mx-auto h-8 w-8 mb-2 text-gray-400" />
          <p>No hay grupos en esta sección</p>
          <p className="text-xs mt-1">
            Los grupos permiten organizar productos relacionados
          </p>
        </div>
      )}

      {optimisticGroups.map((group, index) => (
        <Collapsible
          key={group.id}
          open={expandedGroupIds.has(group.id)}
          onOpenChange={() => handleToggleGroup(group.id)}
        >
          <Card
            className={`border-l-4 border-l-purple-500 ${
              isPending && group.id.startsWith("temp-") ? "opacity-50" : ""
            }`}
          >
            <CardHeader className="py-3">
              <div className="flex items-start gap-2">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(group.id);
                    }}
                    disabled={index === 0 || isPending}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(group.id);
                    }}
                    disabled={
                      index === optimisticGroups.length - 1 || isPending
                    }
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Expand/Collapse trigger */}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expandedGroupIds.has(group.id) ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>

                {/* Group info */}
                <div className="flex-1 min-w-0">
                  {editingGroupId === group.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        placeholder="Nombre del grupo"
                        className="h-8"
                      />
                      <Textarea
                        value={editGroupDescription}
                        onChange={(e) =>
                          setEditGroupDescription(e.target.value)
                        }
                        placeholder="Descripción (opcional)"
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isPending}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-purple-500" />
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="text-xs mt-0.5">
                          {group.description}
                        </CardDescription>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {group.menuItems?.length || 0} producto
                        {group.menuItems?.length !== 1 ? "s" : ""}
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {editingGroupId !== group.id && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(group.id);
                      }}
                      disabled={isPending}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingGroupId(group.id);
                      }}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="pt-0 pb-3">
                <GroupItemsManager
                  group={group}
                  section={section}
                  restaurantId={restaurantId}
                  onUpdate={onUpdate}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Add Group Form */}
      {isAddingGroup ? (
        <Card className="border-2 border-purple-500">
          <CardHeader className="bg-purple-50 py-3">
            <CardTitle className="text-sm text-purple-900">
              Nuevo Grupo de Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label htmlFor="groupName" className="text-sm">
                Nombre del Grupo *
              </Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ej. Gyozas, Rolls, Ramen"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="groupDescription" className="text-sm">
                Descripcion (opcional)
              </Label>
              <Textarea
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Descripcion del grupo de productos"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAddGroup}
                disabled={isPending}
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Grupo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingGroup(false);
                  setNewGroupName("");
                  setNewGroupDescription("");
                }}
                size="sm"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingGroup(true)}
          className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Grupo de Productos
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingGroupId}
        onOpenChange={() => setDeletingGroupId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos del grupo quedaran sin agrupar en la seccion. Esta
              accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
