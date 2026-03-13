export interface VideoEntry {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
}

export const VIDEO_LIBRARY: VideoEntry[] = [
  {
    id: "demo-1",
    title: "Thingsx Retail Video",
    url: "http://thingsx.home:8080/Demo_videos/THINGSX%20retail%20VIDEO%202209%201.1.mp4",
  },
  {
    id: "demo-2",
    title: "Demo Video 2",
    description: "Placeholder — replace with actual video",
    url: "/videos/demo2.mp4",
  },
];
