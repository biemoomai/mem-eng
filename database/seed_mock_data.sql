-- Run this in the Supabase SQL Editor to seed our 5 initial words!
-- This puts data into the Master Dictionary so our app isn't totally empty.

INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url)
VALUES
  (
    'Market', 
    'n.', 
    'A regular gathering of people for the purchase and sale of provisions.', 
    'We buy fresh vegetables at the local ', 
    '.', 
    'https://cdn.pixabay.com/video/2019/04/24/23011-332467188_large.mp4'
  ),
  (
    'Ocean', 
    'n.', 
    'A very large expanse of sea, in particular each of the main areas into which the sea is divided geographically.', 
    'Dolphins are smart animals that live in the ', 
    '.', 
    'https://cdn.pixabay.com/video/2020/05/13/38865-420379471_large.mp4'
  ),
  (
    'Fire', 
    'n.', 
    'Combustion or burning, in which substances combine chemically with oxygen.', 
    'The campers sat around the warm ', 
    ' telling stories.', 
    'https://cdn.pixabay.com/video/2021/08/19/85530-590680315_large.mp4'
  ),
  (
    'City', 
    'n.', 
    'A large human settlement.', 
    'New York is a very busy ', 
    ' that never sleeps.', 
    'https://cdn.pixabay.com/video/2020/04/09/35728-406692751_large.mp4'
  ),
  (
    'Snow', 
    'n.', 
    'Atmospheric water vapor frozen into ice crystals and falling in light white flakes.', 
    'The children went outside to play in the fresh ', 
    '.', 
    'https://cdn.pixabay.com/video/2021/11/27/99630-652333061_large.mp4'
  )
ON CONFLICT (word) DO NOTHING;
