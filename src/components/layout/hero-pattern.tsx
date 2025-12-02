import { GridPattern } from "@/components/layout/grid-pattern";

export function HeroPattern() {
    return (
        <div className="absolute inset-x-0 top-0 -z-10 h-[40rem] overflow-hidden pointer-events-none">
            <div className="absolute left-1/2 top-0 -ml-152 h-100 md:w-349 max-w-full">
                <div className="absolute inset-0 bg-linear-to-r from-[#6366f1] to-[#f43f5e] opacity-40 mask-[radial-gradient(farthest-side_at_top,white,transparent)]">
                    <GridPattern
                        width={72}
                        height={56}
                        x="-12"
                        y="4"
                        squares={[
                            [4, 3],
                            [2, 1],
                            [7, 3],
                            [10, 6],
                        ]}
                        className="absolute inset-x-0 inset-y-[-50%] h-[200%] w-full skew-y-[-18deg] fill-foreground/40 stroke-foreground/50 mix-blend-overlay"
                    />
                </div>
            </div>
        </div>
    );
}
