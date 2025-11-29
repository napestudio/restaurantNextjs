"use client";

import { useState, useRef } from "react";
import type { SerializedMenu } from "@/actions/menus";
import { deleteMenu, updateMenu } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  QrCode,
  ExternalLink,
  Download,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { SITE_URL } from "@/lib/constants";

interface MenuCardProps {
  menu: SerializedMenu;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (menu: SerializedMenu) => void;
}

export function MenuCard({ menu, onEdit, onDelete, onUpdate }: MenuCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteMenu(menu.id);
      if (result.success) {
        onDelete();
      } else {
        alert("Error al eliminar el menú");
      }
    } catch (error) {
      alert("Error al eliminar el menú");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleActive = async () => {
    setIsTogglingActive(true);
    try {
      const result = await updateMenu(menu.id, {
        isActive: !menu.isActive,
      });
      if (result.success && result.menu) {
        onUpdate({
          ...menu,
          isActive: !menu.isActive,
        });
      } else {
        alert("Error al actualizar el menú");
      }
    } catch (error) {
      alert("Error al actualizar el menú");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const sectionCount = menu.menuSections?.length || 0;
  const itemCount =
    menu.menuSections?.reduce(
      (acc, section) => acc + (section.menuItems?.length || 0),
      0
    ) || 0;

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return null;
    }
  };

  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      monday: "Lun",
      tuesday: "Mar",
      wednesday: "Mié",
      thursday: "Jue",
      friday: "Vie",
      saturday: "Sáb",
      sunday: "Dom",
    };
    return days.map((d) => dayMap[d.toLowerCase()] || d).join(", ");
  };

  const menuUrl = `${SITE_URL}/carta/${menu.slug}`;

  const handleShowQR = async () => {
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrDataUrl);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert("Error al generar código QR");
    }
  };

  const handleDownloadQR = async () => {
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(menuUrl, {
        width: 1024,
        margin: 4,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `qr-menu-${menu.slug}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      alert("Error al descargar código QR");
    }
  };

  const handleOpenMenu = () => {
    window.open(menuUrl, "_blank");
  };

  return (
    <>
      <Card className={!menu.isActive ? "opacity-60" : ""}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{menu.name}</CardTitle>
              <CardDescription className="mt-1">
                {menu.description || "Sin descripción"}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggleActive}
                  disabled={isTogglingActive}
                >
                  {menu.isActive ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Activar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{sectionCount} secciones</span>
            <span>{itemCount} productos</span>
          </div>

          {/* Schedule Info */}
          {/* {(menu.availableFrom || menu.availableUntil || menu.daysOfWeek.length > 0) && (
            <div className="space-y-2 text-sm">
              {(menu.availableFrom || menu.availableUntil) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatTime(menu.availableFrom) || "00:00"} -{" "}
                    {formatTime(menu.availableUntil) || "23:59"}
                  </span>
                </div>
              )}
              {menu.daysOfWeek.length > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDays(menu.daysOfWeek)}</span>
                </div>
              )}
            </div>
          )} */}

          {/* Status Badge */}
          <div className="flex gap-2">
            {menu.isActive ? (
              <Badge variant="default" className="bg-green-500">
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
            {menu.branchId ? (
              <Badge variant="outline">Sucursal específica</Badge>
            ) : (
              <Badge variant="outline">Todas las sucursales</Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button onClick={handleShowQR} variant="outline" size="sm" className="flex-1">
              <QrCode className="h-4 w-4 mr-2" />
              QR
            </Button>
            <Button onClick={handleOpenMenu} variant="outline" size="sm" className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver
            </Button>
          </div>
          <Button onClick={onEdit} variant="default" className="w-full">
            <Pencil className="h-4 w-4 mr-2" />
            Editar Menú
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar menú?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el menú &quot;
              {menu.name}&quot; y todas sus secciones y productos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR del Menú</DialogTitle>
            <DialogDescription>
              Escanea este código QR para acceder al menú &quot;{menu.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-64 h-64 border border-gray-200 rounded-lg"
              />
            )}
            <div className="text-sm text-gray-600 text-center break-all px-4">
              {menuUrl}
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar QR
              </Button>
              <Button
                onClick={handleOpenMenu}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Menú
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
