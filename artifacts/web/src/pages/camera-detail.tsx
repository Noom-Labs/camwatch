import React from "react";

export default function CameraDetail({ params }: { params: { id: string } }) {
  return <div>Camera Detail {params.id}</div>;
}
