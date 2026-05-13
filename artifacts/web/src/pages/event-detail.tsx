import React from "react";

export default function EventDetail({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Detalhes do evento</h1>
      <p className="text-muted-foreground">Evento #{params.id}</p>
    </div>
  );
}
