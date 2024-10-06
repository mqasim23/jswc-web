const Link = ({data}) => {
    return (
        <div>
            <a id={data.Properties.ID}
                href={data.Properties.Href}
                target={data.Properties?.Target || '_blank'} // Default to new tab/window
                download={data.Properties?.Download === 1}
            >
                {data.Properties?.Label !== undefined ? data.Properties.Label : data.Properties.Href}
            </a>
        </div>
    );
};

export default Link;
