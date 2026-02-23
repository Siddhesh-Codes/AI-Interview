import InterviewEngine from '@/components/interview/interview-engine';

export const metadata = {
  title: 'AI Interview',
  description: 'Complete your AI-powered voice interview',
};

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InterviewEngine token={token} />;
}
