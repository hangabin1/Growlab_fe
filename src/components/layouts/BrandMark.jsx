import logoShape from "../../assets/logoShapeIcon.png";

function BrandMark({ className = "", size = 36 }) {
    return (
        <span aria-hidden="true" className={`block shrink-0 bg-current text-brand ${className}`}
            style={{ width: size, height: size, maskImage: `url(${logoShape})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} />
    );
}

export default BrandMark;
