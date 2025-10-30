import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl shadow-sm p-3 md:p-4 ${className}`}
    style={{
      border: "1px solid var(--card-border, rgb(226 232 240))",
      background: "var(--card-bg, rgba(255, 255, 255, 0.7))",
    }}
  >
    {children}
  </div>
);

type RatedImage = {
  src: string;
  title: string;
  rating: number;
  objectId: string;
  objectName: string;
  projectId: string;
  projectName: string;
  keyName: string;
};

export default function RatingGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialObjects = location.state?.objects || [];
  const theme = location.state?.theme || "astro";
  
  const [objects, setObjects] = useState(initialObjects);
  const [filterRating, setFilterRating] = useState<"all" | "3" | "2" | "1">("all");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState("");

  // Save changes to localStorage whenever objects change
  useEffect(() => {
    try {
      localStorage.setItem("astroTrackerData", JSON.stringify(objects));
    } catch (err) {
      console.warn("No se pudo guardar en localStorage:", err);
    }
  }, [objects]);

  // Function to update rating
  const updateRating = (objectId: string, projectId: string, keyName: string, newRating: number) => {
    setObjects((prevObjects: any[]) =>
      prevObjects.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              projects: obj.projects.map((proj: any) =>
                proj.id === projectId
                  ? {
                      ...proj,
                      ratings: {
                        ...proj.ratings,
                        [keyName]: newRating,
                      },
                    }
                  : proj
              ),
            }
          : obj
      )
    );
    toast.success("Valoración actualizada");
  };

  // Function to delete image
  const deleteImage = (objectId: string, projectId: string, keyName: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta imagen?")) return;
    
    setObjects((prevObjects: any[]) =>
      prevObjects.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              projects: obj.projects.map((proj: any) =>
                proj.id === projectId
                  ? {
                      ...proj,
                      images: Object.fromEntries(
                        Object.entries(proj.images || {}).filter(([key]) => key !== keyName)
                      ),
                      ratings: Object.fromEntries(
                        Object.entries(proj.ratings || {}).filter(([key]) => key !== keyName)
                      ),
                    }
                  : proj
              ),
            }
          : obj
      )
    );
    toast.success("Imagen eliminada");
  };

  // Collect all rated images
  const allRatedImages: RatedImage[] = [];
  
  objects.forEach((obj: any) => {
    obj.projects.forEach((proj: any) => {
      const ratings = proj.ratings || {};
      const images = proj.images || {};
      
      Object.keys(ratings).forEach((keyName) => {
        const rating = ratings[keyName];
        const imageSrc = images[keyName];
        
        if (rating > 0 && imageSrc) {
          // Generate a readable title based on keyName
          let title = keyName;
          if (keyName === "finalProject") {
            title = "Imagen final del proyecto";
          } else if (keyName.startsWith("initial")) {
            title = `Imagen inicial ${keyName.replace("initial", "")}`;
          } else if (keyName.startsWith("final")) {
            title = `Imagen final ${keyName.replace("final", "")}`;
          } else if (keyName === "panelSchema") {
            title = "Esquema de paneles";
          }
          
          allRatedImages.push({
            src: imageSrc,
            title,
            rating,
            objectId: obj.id,
            objectName: obj.commonName || obj.id,
            projectId: proj.id,
            projectName: proj.name,
            keyName,
          });
        }
      });
    });
  });

  // Filter images by rating
  const filteredImages = allRatedImages
    .filter((img) => {
      if (filterRating === "all") return true;
      return img.rating === parseInt(filterRating);
    })
    .sort((a, b) => b.rating - a.rating); // Sort by rating descending

  // Count images by rating
  const rating3Count = allRatedImages.filter((img) => img.rating === 3).length;
  const rating2Count = allRatedImages.filter((img) => img.rating === 2).length;
  const rating1Count = allRatedImages.filter((img) => img.rating === 1).length;

  return (
    <div className={`min-h-screen ${theme === "astro" ? "astro-bg" : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"}`}>
      <style>{`
        .astro-bg {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          position: relative;
        }
        .astro-bg::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(2px 2px at 90% 60%, white, transparent),
            radial-gradient(1px 1px at 33% 80%, white, transparent),
            radial-gradient(2px 2px at 75% 25%, white, transparent);
          background-size: 200% 200%;
          animation: stars 8s linear infinite;
          opacity: 0.5;
          pointer-events: none;
        }
        @keyframes stars {
          from { background-position: 0 0; }
          to { background-position: 100% 100%; }
        }
      `}</style>
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </button>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Galería de Valoraciones
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Todas tus fotos organizadas por valoración
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Valoradas</div>
                <div className="text-2xl font-bold">{allRatedImages.length}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">3 Estrellas</div>
                <div className="text-2xl font-bold">{rating3Count}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <div className="flex gap-0.5">
                  {[1, 2].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-blue-400 text-blue-400" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">2 Estrellas</div>
                <div className="text-2xl font-bold">{rating2Count}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-500/10">
                <Star className="w-3 h-3 fill-slate-400 text-slate-400" />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">1 Estrella</div>
                <div className="text-2xl font-bold">{rating1Count}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter */}
        <Card className="p-5 mb-6">
          <Label className="mb-3 block text-base font-semibold">Filtrar por valoración</Label>
          <RadioGroup
            value={filterRating}
            onValueChange={(value: any) => setFilterRating(value)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer font-normal">
                Todas ({allRatedImages.length})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="3stars" />
              <Label htmlFor="3stars" className="cursor-pointer font-normal flex items-center gap-1">
                3 Estrellas
                <div className="flex gap-0.5 ml-1">
                  {[1, 2, 3].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                ({rating3Count})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="2stars" />
              <Label htmlFor="2stars" className="cursor-pointer font-normal flex items-center gap-1">
                2 Estrellas
                <div className="flex gap-0.5 ml-1">
                  {[1, 2].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-blue-400 text-blue-400" />
                  ))}
                </div>
                ({rating2Count})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="1star" />
              <Label htmlFor="1star" className="cursor-pointer font-normal flex items-center gap-1">
                1 Estrella
                <Star className="w-3 h-3 fill-slate-400 text-slate-400 ml-1" />
                ({rating1Count})
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Gallery */}
        {filteredImages.length === 0 ? (
          <Card className="p-8 text-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400">
              No hay imágenes {filterRating !== "all" ? `con ${filterRating} ${filterRating === "1" ? "estrella" : "estrellas"}` : "valoradas"} aún
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((img, idx) => (
              <Card key={`${img.projectId}-${img.keyName}-${idx}`} className="p-4 relative">
                <div className="mb-3 relative group">
                  <img
                    src={img.src}
                    alt={img.title}
                    className="w-full h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setImageModalSrc(img.src);
                      setImageModalOpen(true);
                    }}
                  />
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(img.objectId, img.projectId, img.keyName);
                    }}
                    className="absolute bottom-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {img.title}
                  </h3>
                  {/* Interactive rating stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Star
                        key={i}
                        onClick={() => updateRating(img.objectId, img.projectId, img.keyName, i + 1)}
                        className={`w-4 h-4 cursor-pointer transition-all hover:scale-110 ${
                          i < img.rating
                            ? theme === "astro"
                              ? "fill-blue-400 text-blue-400"
                              : "fill-yellow-400 text-yellow-400"
                            : "text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <div><strong>Objeto:</strong> {img.objectName}</div>
                  <div><strong>Proyecto:</strong> {img.projectName}</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {imageModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setImageModalOpen(false)}
          >
            <div className="relative max-w-7xl max-h-[90vh]">
              <img
                src={imageModalSrc}
                alt="Vista ampliada"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setImageModalOpen(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
