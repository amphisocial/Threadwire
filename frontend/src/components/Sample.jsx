import React, { useState } from 'react';

function Sample() {
    const [count, setCount] = useState(0);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Hello from JSX!</h1>
            <p>Click count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Click me
            </button>
        </div>
    );
}

export default Sample;
