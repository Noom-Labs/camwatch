import React from "react";
import { useParams } from "wouter";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Detalhes do evento</h1>
      <p className="text-muted-foreground">Evento #{id}</p>
    </div>
  );
}
