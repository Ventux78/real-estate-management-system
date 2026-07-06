import { Container } from '@/components/ui/Container';
import { SkeletonDetail } from '@/components/properties/SkeletonDetail';

export default function Loading() {
  return (
    <div className="bg-[#121212] py-12 min-h-screen">
      <Container>
        <SkeletonDetail />
      </Container>
    </div>
  );
}
