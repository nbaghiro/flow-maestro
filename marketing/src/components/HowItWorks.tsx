import React from "react";

export const HowItWorks: React.FC = () => {
    return (
        <section className="flex flex-col px-7 mb-[100px]">
            {/*Title*/}
            <div className="h-[300px] flex justify-between">
                <div className="text-8xl">
                    <p>
                        How It
                        <br />
                        Works
                    </p>
                </div>
                {/*Intro*/}
                <div className="w-[500px] font-semibold">
                    <p>
                        is a long established fact that a reader will be distracted by the readable
                        readable content of a page when looking at its layout. The point of using
                        Lorem Ipsum is that it has a more-or-less normal.
                    </p>
                </div>
            </div>

            {/*Stack*/}
            <div className="flex-1 flex flex-col gap-7">
                <div>
                    <div className="w-[50%] flex items-center">
                        <div className="bg-white w-[320px] h-[200px] rounded-lg mr-4">
                            <p></p>
                        </div>
                        <div className="flex-1 border-b-[1.5px] border-black border-dashed" />
                        <div className="bg-black rounded-full w-6 h-6 text-white flex items-center justify-center ml-2">
                            <p>1</p>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="w-[50%] flex items-center flex-row-reverse ml-auto">
                        <div className="bg-white w-[320px] h-[200px] rounded-lg ml-4">
                            <p></p>
                        </div>
                        <div className="flex-1 border-b-[1.5px] border-black border-dashed ml-2" />
                        <div className="bg-black rounded-full w-6 h-6 text-white flex items-center justify-center">
                            <p>2</p>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="w-[50%] flex items-center">
                        <div className="bg-white w-[320px] h-[200px] rounded-lg mr-4">
                            <p></p>
                        </div>
                        <div className="flex-1 border-b-[1.5px] border-black border-dashed mr-2" />
                        <div className="bg-black rounded-full w-6 h-6 text-white flex items-center justify-center">
                            <p>3</p>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="w-[50%] flex items-center flex-row-reverse ml-auto">
                        <div className="bg-white w-[320px] h-[200px] rounded-lg ml-4">
                            <p></p>
                        </div>
                        <div className="flex-1 border-b-[1.5px] border-black border-dashed ml-2" />
                        <div className="bg-black rounded-full w-6 h-6 text-white flex items-center justify-center">
                            <p>4</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
