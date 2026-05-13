import React from "react";
import { useParams } from "wouter";

export default function CameraDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Detalhes da câmera</h1>
      <p className="text-muted-foreground">Câmera #{id}</p>
    </div>
  );
}
