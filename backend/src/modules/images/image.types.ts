export interface ImageDto {
  id: string;
  propertyId: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  displayOrder: number;
  isCover: boolean;
  createdAt: Date;
}

export interface ReorderImageDto {
  id: string;
  displayOrder: number;
}
