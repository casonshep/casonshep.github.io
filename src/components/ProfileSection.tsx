import type { ProfileData } from '../utils/types';

interface ProfileSectionProps {
  profile: ProfileData;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ profile }) => {
  return (
    <div className="flex items-center gap-8 my-8 mx-0 p-8 bg-cream-100 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="profile-image-container">
        <img 
          src={profile.image} 
          alt={profile.name}
          className="profile-image"
        />
      </div>
      <div className="flex-1">
        <h2 className="text-teal-600 mb-4 text-3xl font-bold">
          Hi, I'm {profile.name.split(' ')[0]}
        </h2>
        <p className="text-slate-900 text-lg leading-relaxed m-0">
          {profile.bio}
        </p>
        {profile.education && (
          <p className="text-slate-600 text-base mt-3 italic">
            {profile.education}
          </p>
        )}
      </div>
    </div>
  );
};

// Responsive styles for mobile
export const ProfileSectionResponsive: React.FC<ProfileSectionProps> = ({ profile }) => {
  return (
    <div className="flex flex-col md:flex-row items-center gap-8 my-8 mx-0 p-6 md:p-8 bg-cream-100 rounded-lg shadow-md max-w-4xl mx-auto text-center md:text-left">
      <div className="profile-image-container mx-auto md:mx-0">
        <img 
          src={profile.image} 
          alt={profile.name}
          className="profile-image"
        />
      </div>
      <div className="flex-1">
        <h2 className="text-teal-600 mb-4 text-2xl md:text-3xl font-bold">
          Hi, I'm {profile.name.split(' ')[0]}
        </h2>
        <p className="text-slate-900 text-base md:text-lg leading-relaxed m-0">
          {profile.bio}
        </p>
        {profile.education && (
          <p className="text-slate-600 text-sm md:text-base mt-3 italic">
            {profile.education}
          </p>
        )}
      </div>
    </div>
  );
};