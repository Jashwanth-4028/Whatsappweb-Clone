type AvatarProps = {
  name: string;
  avatarUrl?: string;
  small?: boolean;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Avatar = ({ name, avatarUrl, small }: AvatarProps) => {
  return (
    <div className={`avatar ${small ? "sm" : ""}`}>
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : <span>{initials(name)}</span>}
    </div>
  );
};

export default Avatar;
