import React from "react";

export default function CameraDetail({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Detalhes da câmera</h1>
      <p className="text-muted-foreground">Câmera #{params.id}</p>
    </div>
  );
}
