import React from "react";

export default function EventDetail({ params }: { params: { id: string } }) {
  return <div>Event Detail {params.id}</div>;
}
